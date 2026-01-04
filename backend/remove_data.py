from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from werkzeug.security import generate_password_hash, check_password_hash
from enum import Enum
from sqlalchemy import UniqueConstraint, func
import os
from flask import send_from_directory, request
from datetime import  timezone, timedelta
from sqlalchemy.orm import joinedload
from sqlalchemy import literal, or_
from werkzeug.utils import secure_filename
import time
from datetime import timezone, timedelta
import pytz
from collections import defaultdict

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:123@localhost:5432/MarketPlace'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def now_vn():
    return datetime.now(VN_TZ)

def to_vn_date(dt, fmt='%d/%m/%Y'):
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt) 
    return dt.astimezone(VN_TZ).strftime(fmt)

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

db = SQLAlchemy(app)

class ProductStatus(Enum):
    waiting_for_approve = "waiting_for_approve"
    approved = "approved"
    rejected = "rejected"
    inactive = "inactive"

class OrderStatus(Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipping = "shipping"
    completed = "completed"
    cancelled = "cancelled"

class Admin(db.Model):
    __tablename__ = "admins"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)

class Seller(db.Model):
    __tablename__ = "sellers"
    id = db.Column(db.Integer, primary_key=True)
    shop_name = db.Column(db.String(150), nullable=False)
    owner_name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone_number = db.Column(db.String(20))
    password_hash = db.Column(db.Text, nullable=False)
    avatar = db.Column(db.String(300))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=now_vn)
    updated_at = db.Column(db.DateTime, onupdate=now_vn)
    products = db.relationship("Product", backref="seller", lazy=True)

class Buyer(db.Model):
    __tablename__ = "buyers"
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone_number = db.Column(db.String(20))
    password_hash = db.Column(db.Text, nullable=False)
    address_line = db.Column(db.String(255), default="")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=now_vn)
    updated_at = db.Column(db.DateTime, onupdate=now_vn)
    orders = db.relationship("Order", backref="buyer", lazy=True)
    cart = db.relationship("Cart", uselist=False, backref="buyer")

class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    products = db.relationship("Product", backref="category", lazy=True)

class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("sellers.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock_quantity = db.Column(db.Integer, nullable=False)
    image_url = db.Column(db.Text)
    status = db.Column(PgEnum(ProductStatus, name="product_status"), default=ProductStatus.waiting_for_approve)
    created_at = db.Column(db.DateTime, default=now_vn)
    updated_at = db.Column(db.DateTime, onupdate=now_vn)
    order_items = db.relationship("OrderItem", backref="product", lazy=True)
    viewed_at = db.Column(db.DateTime, default=now_vn)
    view_count = db.Column(db.Integer, default=0, nullable=False)

class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyers.id"), nullable=False)
    shopping_address = db.Column(db.String(255), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=now_vn)

    items = db.relationship("OrderItem", backref="order", lazy=True)

class OrderItem(db.Model):
    __tablename__ = "order_items"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    seller_id = db.Column(           
        db.Integer,
        db.ForeignKey("sellers.id"),
        nullable=False
    )
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(                 
        PgEnum(OrderStatus, name="order_item_status"),
        default=OrderStatus.pending,
        nullable=False
    )

class Cart(db.Model):
    __tablename__ = "carts"
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyers.id"), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=now_vn)
    items = db.relationship("CartItem", backref="cart", lazy=True, cascade="all, delete-orphan")

class CartItem(db.Model):
    __tablename__ = "cart_items"
    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("carts.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    __table_args__ = (UniqueConstraint("cart_id", "product_id", name="uq_cart_product"),)
with app.app_context():
    try:
        db.session.execute(db.text("SELECT 1"))
        print("✅ Database connected successfully")

        # Remove all rows from all tables (child tables first)
        OrderItem.query.delete()
        Order.query.delete()

        CartItem.query.delete()
        Cart.query.delete()

        Product.query.delete()
        Category.query.delete()

        Seller.query.delete()
        Buyer.query.delete()
        Admin.query.delete()

        db.session.commit()

        print("✅ All rows deleted from all tables")
    except Exception as e:
        db.session.rollback()
        print("❌ Database operation failed:", e)
