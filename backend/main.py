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
from sqlalchemy import union_all
from sqlalchemy import column

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

ROLE_MAP = {"Người mua": "buyer", "Người bán": "seller"}

def to_vn_time(utc_dt):
    if utc_dt is None:
        return None
    utc_aware = utc_dt.replace(tzinfo=timezone.utc)
    return utc_aware.astimezone(VN_TZ)

def vn_str(utc_dt, fmt='%d/%m/%Y %H:%M'):
    vn = to_vn_time(utc_dt)
    return vn.strftime(fmt) if vn else ""

@app.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([{'id': c.id, 'name': c.name} for c in categories]), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    ADMIN_EMAIL = 'admin@demo.com'
    ADMIN_PASSWORD = 'admin123'

    if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': 0,
                'email': ADMIN_EMAIL,
                'role': 'admin'
            }
        }), 200

    seller = Seller.query.filter_by(email=email).first()
    if seller:
        if not seller.is_active:
            return jsonify({'message': 'Account is blocked'}), 403
        if check_password_hash(seller.password_hash, password):
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': seller.id,
                    'email': seller.email,
                    'role': 'seller'
                }
            }), 200

    buyer = Buyer.query.filter_by(email=email).first()
    if buyer:
        if not buyer.is_active:
            return jsonify({'message': 'Account is blocked'}), 403
        if check_password_hash(buyer.password_hash, password):
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': buyer.id,
                    'email': buyer.email,
                    'role': 'buyer'
                }
            }), 200

    return jsonify({'message': 'Invalid email or password'}), 401


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')

    if (
        Seller.query.filter_by(email=email).first() or
        Buyer.query.filter_by(email=email).first()
    ):
        return jsonify({'message': 'Email already exists'}), 400

    role = ROLE_MAP.get(data.get('role', 'Người mua'))

    password_hash = generate_password_hash(data.get('password'))

    if role == 'buyer':
        buyer = Buyer(
            full_name=data.get('name'),
            email=email,
            phone_number=data.get('phone_number'),
            password_hash=password_hash,
            is_active=False
        )
        db.session.add(buyer)

    elif role == 'seller':
        seller = Seller(
            shop_name=data.get('name'),
            email=email,
            phone_number=data.get('phone_number'),
            password_hash=password_hash,
            is_active=False
        )
        db.session.add(seller)

    else:
        return jsonify({'message': 'Invalid role'}), 400

    db.session.commit()
    return jsonify({'message': 'Register successful'}), 201


#buyer

@app.route('/products', methods=['GET'])
def get_all_products():
    products = Product.query.filter_by(status=ProductStatus.approved).all()
    result = []
    for p in products:
        seller = p.seller
        image_path = p.image_url.split(',')[0].strip() if p.image_url else ''
        full_image_url = image_path

        result.append({
            'id': p.id,
            'name': p.name,
            'price': float(p.price),
            'description': p.description or '',
            'image_url': full_image_url, 
            'seller_id': p.seller_id,
            'seller_name': seller.shop_name if seller else 'Shop',
            'category': {
                'id': p.category_id,
                'name': p.category.name if p.category else 'Other'
            }
        })
    return jsonify(result), 200

@app.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    if product.status != ProductStatus.approved:
        return jsonify({'error': 'Sản phẩm chưa được phê duyệt hoặc không khả dụng'}), 403
    
    product.view_count += 1
    product.viewed_at = datetime.utcnow()
    db.session.commit()
    
    seller = product.seller
    image_path = product.image_url.split(',')[0].strip() if product.image_url else ''
    full_image_url = image_path

    return jsonify({
        'id': product.id,
        'name': product.name,
        'description': product.description or '',
        'price': float(product.price),
        'image_url': full_image_url, 
        'seller_id': product.seller_id,
        'seller_name': seller.shop_name if seller else 'Shop',
        'shop': seller.shop_name if seller else 'Shop', 
        'category': {
            'id': product.category_id,
            'name': product.category.name if product.category else 'Khác'
        }
    }), 200

@app.route('/cart', methods=['GET'])
def get_cart():
    buyer_id = request.args.get('buyer_id', type=int)
    if not buyer_id:
        return jsonify({'error': 'Thiếu buyer_id'}), 400

    cart = Cart.query.filter_by(buyer_id=buyer_id).first()
    if not cart:
        return jsonify({'items': [], 'total': 0}), 200

    items = []
    total = 0
    for ci in cart.items:
        product = Product.query.get(ci.product_id)
        if product:
            image_path = product.image_url.split(',')[0].strip() if product.image_url else ''
            full_image_url = f'http://10.0.2.2:5000{image_path}' if image_path.startswith('/') else image_path

            item_data = {
                'id': ci.id,
                'product_id': ci.product_id,
                'name': product.name,
                'price': float(ci.unit_price),
                'quantity': ci.quantity,
                'image': full_image_url,
                'shop': product.seller.shop_name if product.seller else 'Shop',
                'subtotal': float(ci.subtotal)
            }
            items.append(item_data)
            total += ci.subtotal

    return jsonify({'items': items, 'total': float(total)}), 200

@app.route('/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    required = ['buyer_id', 'product_id', 'quantity']
    if not all(k in data for k in required):
        return jsonify({'error': 'Thiếu thông tin bắt buộc'}), 400

    buyer_id = data['buyer_id']
    product_id = data['product_id']
    quantity = data['quantity']

    product = Product.query.get_or_404(product_id)

    if product.stock_quantity < quantity:
        return jsonify({'error': 'Vượt quá số lượng tồn kho'}), 400

    cart = Cart.query.filter_by(buyer_id=buyer_id).first()
    if not cart:
        cart = Cart(buyer_id=buyer_id)
        db.session.add(cart)
        db.session.flush()

    cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()
    if cart_item:
        cart_item.quantity += quantity
        cart_item.subtotal = cart_item.quantity * product.price
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=product_id,
            quantity=quantity,
            unit_price=product.price,
            subtotal=quantity * product.price
        )
        db.session.add(cart_item)

    db.session.commit()
    return jsonify({'message': 'Đã thêm vào giỏ hàng'}), 201

@app.route('/cart/item/<int:item_id>', methods=['PUT'])
def update_cart_item(item_id):
    data = request.get_json()
    quantity = data.get('quantity')

    if quantity is None or quantity < 1:
        return jsonify({'error': 'Số lượng không hợp lệ'}), 400

    cart_item = CartItem.query.get_or_404(item_id)
    product = Product.query.get(cart_item.product_id)

    if product.stock_quantity < quantity:
        return jsonify({'error': 'Vượt quá tồn kho'}), 400

    cart_item.quantity = quantity
    cart_item.subtotal = quantity * cart_item.unit_price
    db.session.commit()
    return jsonify({'message': 'Cập nhật thành công'}), 200

@app.route('/cart/item/<int:item_id>', methods=['DELETE'])
def delete_cart_item(item_id):
    cart_item = CartItem.query.get_or_404(item_id)
    db.session.delete(cart_item)
    db.session.commit()
    return jsonify({'message': 'Đã xóa sản phẩm khỏi giỏ'}), 200

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    buyer_id = data.get('buyer_id')

    if not buyer_id:
        return jsonify({'error': 'Thiếu buyer_id'}), 400

    buyer = Buyer.query.get_or_404(buyer_id)

    shopping_address = buyer.address_line
    if not shopping_address:
        return jsonify({'error': 'Chưa có địa chỉ giao hàng'}), 400

    cart = Cart.query.filter_by(buyer_id=buyer_id).first()
    if not cart or not cart.items:
        return jsonify({'error': 'Giỏ hàng trống'}), 400

    total_amount = sum(item.subtotal for item in cart.items)

    order = Order(
        buyer_id=buyer_id,
        shopping_address=shopping_address,
        total_amount=total_amount
    )
    db.session.add(order)
    db.session.flush()

    for cart_item in cart.items:
        product = Product.query.get_or_404(cart_item.product_id)

        if product.stock_quantity < cart_item.quantity:
            return jsonify({'error': f'Sản phẩm "{product.name}" không đủ tồn kho'}), 400

        db.session.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            seller_id=product.seller_id,
            quantity=cart_item.quantity,
            unit_price=cart_item.unit_price,
            subtotal=cart_item.subtotal,
            status=OrderStatus.pending
        ))

        product.stock_quantity -= cart_item.quantity

    db.session.delete(cart)
    db.session.commit()

    return jsonify({
        'message': 'Đặt hàng thành công',
        'order_id': order.id
    }), 201



@app.route('/orders', methods=['GET'])
def get_orders():
    buyer_id = request.args.get('buyer_id', type=int)
    if not buyer_id:
        return jsonify({'error': 'Thiếu buyer_id'}), 400

    orders = (
        Order.query
        .filter_by(buyer_id=buyer_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    result = []
    for order in orders:
        for item in order.items:
            product = item.product

            image_path = (
                product.image_url.split(',')[0].strip()
                if product.image_url else ''
            )

            full_image_url = (
                f'http://10.0.2.2:5000{image_path}'
                if image_path.startswith('/')
                else image_path
            )

            result.append({
                'order_id': order.id,
                'order_item_id': item.id,        
                'product_id': product.id,
                'name': product.name,
                'price': float(item.unit_price),
                'quantity': item.quantity,
                'subtotal': float(item.subtotal),
                'image': full_image_url,
                'shop': product.seller.shop_name,
                'seller_id': item.seller_id,
                'orderDate': to_vn_date(order.created_at),
                'status': item.status.value      
            })

    return jsonify(result), 200

@app.route('/profile/buyer/<int:buyer_id>', methods=['GET', 'PUT'])
def profile_buyer(buyer_id):
    buyer = Buyer.query.get_or_404(buyer_id)

    if request.method == 'PUT':
        data = request.get_json()

        if 'full_name' in data:
            buyer.full_name = data['full_name'].strip() if data['full_name'] else buyer.full_name

        if 'email' in data:
            new_email = data['email'].strip() if data['email'] else buyer.email
            if new_email != buyer.email:
                if Buyer.query.filter(Buyer.email == new_email, Buyer.id != buyer_id).first():
                    return jsonify({'error': 'Email đã được sử dụng bởi tài khoản khác'}), 400
                buyer.email = new_email

        if 'address_line' in data:
            buyer.address_line = data['address_line'].strip() if data['address_line'] else buyer.address_line

        if 'phone_number' in data:
            new_phone = data['phone_number'].strip() if data['phone_number'] else buyer.phone_number
            if new_phone:
                import re
                if not re.match(r'^(0[3|5|7|8|9][0-9]{8}|84[3|5|7|8|9][0-9]{8}|\+84[3|5|7|8|9][0-9]{8})$', new_phone):
                    return jsonify({'error': 'Số điện thoại không hợp lệ (10 số, bắt đầu 03/05/07/08/09)'}), 400
                
                if Buyer.query.filter(Buyer.phone_number == new_phone, Buyer.id != buyer_id).first():
                    return jsonify({'error': 'Số điện thoại đã được sử dụng bởi tài khoản khác'}), 400
                
                buyer.phone_number = new_phone

        if 'password' in data and data['password']:
            buyer.password_hash = generate_password_hash(data['password'])

        db.session.commit()

    return jsonify({
        'id': buyer.id,
        'full_name': buyer.full_name or '',
        'email': buyer.email or '',
        'phone': buyer.phone_number or '',
        'address_line': buyer.address_line or '',
        'role': 'Người mua'
    }), 200

#seller
@app.route('/profile/seller/<int:seller_id>', methods=['GET'])
def profile_seller(seller_id):
    seller = Seller.query.get_or_404(seller_id)

    total_products = Product.query.filter_by(seller_id=seller_id).count()

    revenue = (
        db.session.query(func.coalesce(func.sum(OrderItem.subtotal), 0))
        .filter(
            OrderItem.seller_id == seller_id,
            OrderItem.status == OrderStatus.completed
        )
        .scalar()
    )


    total_orders = (
        db.session.query(func.count(OrderItem.id))
        .filter(OrderItem.seller_id == seller_id)
        .scalar()
    )

    completed_orders = (
        db.session.query(func.count(OrderItem.id))
        .filter(
            OrderItem.seller_id == seller_id,
            OrderItem.status == OrderStatus.completed
        )
        .scalar()
    )


    avatar_url = ''
    if seller.avatar:
        avatar_url = (
            f'http://10.0.2.2:5000{seller.avatar}'
            if seller.avatar.startswith('/')
            else seller.avatar
        )

    return jsonify({
        'id': seller.id,
        'shop_name': seller.shop_name,
        'email': seller.email,
        'avatar': avatar_url,
        'stats': {
            'products': total_products,
            'orders': total_orders,
            'completed': completed_orders,
            'revenue': float(revenue)
        }
    }), 200



@app.route('/profile/seller/<int:seller_id>', methods=['POST', 'PUT'])
def update_seller_profile(seller_id):
    seller = Seller.query.get_or_404(seller_id)
    if 'shop_name' in request.form:
        name = request.form['shop_name'].strip()
        if name:
            seller.shop_name = name

    if 'email' in request.form:
        email = request.form['email'].strip()
        if email:
            seller.email = email

    if 'password' in request.form:
        pwd = request.form['password'].strip()
        if pwd:
            seller.password_hash = generate_password_hash(pwd)
    if 'avatar' in request.files:
        file = request.files['avatar']
        if file and file.filename:
            original = secure_filename(file.filename)
            ext = os.path.splitext(original)[1].lower() or '.jpg'
            filename = f"avatar_{seller_id}_{int(time.time())}{ext}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            file.save(save_path)
            seller.avatar = f"/uploads/{filename}"

    db.session.commit()

    avatar_url = (
        f"http://10.0.2.2:5000{seller.avatar}"
        if seller.avatar and seller.avatar.startswith('/')
        else seller.avatar or ''
    )

    return jsonify({
        "message": "Updated successfully",
        "avatar": avatar_url
    }), 200


@app.route('/seller/<int:seller_id>/orders', methods=['GET'])
def seller_orders(seller_id):
    from_date_str = request.args.get('from_date')
    to_date_str = request.args.get('to_date')

    query = (
        db.session.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(OrderItem.seller_id == seller_id)
        .options(
            joinedload(OrderItem.order).joinedload(Order.buyer),
            joinedload(OrderItem.product)
        )
        .order_by(Order.created_at.desc())
    )

    VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

    if from_date_str:
        try:
            local_start = datetime.strptime(from_date_str, '%Y-%m-%d')
            vn_start = VN_TZ.localize(local_start.replace(hour=0, minute=0, second=0))
            utc_start = vn_start.astimezone(timezone.utc)
            query = query.filter(Order.created_at >= utc_start)
        except ValueError:
            pass

    if to_date_str:
        try:
            local_end = datetime.strptime(to_date_str, '%Y-%m-%d')
            vn_end = VN_TZ.localize(local_end.replace(hour=23, minute=59, second=59))
            utc_end = vn_end.astimezone(timezone.utc)
            query = query.filter(Order.created_at <= utc_end)
        except ValueError:
            pass

    items = query.all()

    result = []
    for item in items:
        result.append({
            'order_id': item.order.id,
            'order_item_id': item.id,
            'order_code': f"DH{item.order.id:06d}",
            'status': item.status.value,
            'created_at': to_vn_date(item.order.created_at),
            'seller_subtotal': float(item.subtotal),
            'buyer': {
                'full_name': item.order.buyer.full_name,
                'phone': item.order.buyer.phone_number
            },
            'product': {
                'name': item.product.name,
                'quantity': item.quantity,
                'price': float(item.unit_price)
            }
        })

    return jsonify(result), 200

@app.route('/seller/<int:seller_id>/order-item/<int:order_item_id>/status', methods=['PATCH'])
def update_order_item_status(seller_id, order_item_id):
    data = request.get_json()
    new_status = data.get('status')

    if not new_status:
        return jsonify({'message': 'Thiếu status'}), 400

    try:
        new_status_enum = OrderStatus(new_status)
    except ValueError:
        return jsonify({'message': 'Status không hợp lệ'}), 400

    order_item = OrderItem.query.filter_by(
        id=order_item_id,
        seller_id=seller_id
    ).first()

    if not order_item:
        return jsonify({'message': 'Không có quyền cập nhật đơn này'}), 403

    order_item.status = new_status_enum
    db.session.commit()

    return jsonify({
        'message': 'Cập nhật trạng thái thành công',
        'order_item_id': order_item.id,
        'status': order_item.status.value
    }), 200

@app.route('/upload', methods=['POST'])
def upload():
    if 'image' not in request.files:
        return jsonify({'error': 'No image part'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(save_path)

    return jsonify({
        'url': f"/uploads/{filename}"
    }), 200


@app.route('/seller/<int:seller_id>/products', methods=['GET'])
def get_seller_products(seller_id):
    products = Product.query.options(
        joinedload(Product.category)
    ).filter_by(seller_id=seller_id).all()

    result = []
    for p in products:
        status = p.status.value if p.status else "inactive"
        images = [
            f"http://10.0.2.2:5000{x.strip()}" if x.strip().startswith('/') else x.strip()
            for x in (p.image_url or "").split(",") if x.strip()
        ]

        created_at = to_vn_date(p.created_at, fmt="%d/%m/%Y")

        result.append({
            "id": p.id,
            "name": p.name or "",
            "description": p.description or "",
            "price": float(p.price or 0),
            "stock_quantity": int(p.stock_quantity or 0),
            "status": status,
            "category_id": p.category_id or 0,
            "category_name": p.category.name if p.category else "Khác",
            "created_at": created_at,
            "images": images  
        })

    return jsonify(result), 200

@app.route('/seller/<int:seller_id>/products', methods=['POST'])
def add_product(seller_id):
    data = request.get_json()
    required = ['name', 'price', 'stock_quantity', 'category_id']
    if not all(k in data for k in required):
        return jsonify({'message': 'Thiếu thông tin bắt buộc'}), 400

    category = db.session.get(Category, data['category_id'])
    if not category:
        return jsonify({'message': 'Danh mục không tồn tại'}), 400

    product = Product(
        seller_id=seller_id,
        category_id=data['category_id'],
        name=data['name'],
        description=data.get('description', ''),
        price=data['price'],
        stock_quantity=data['stock_quantity'],
        image_url=",".join(data.get('images', [])),
        status=ProductStatus.waiting_for_approve
    )
    db.session.add(product)
    db.session.commit()

    images = [
        f"http://10.0.2.2:5000{x.strip()}" if x.strip().startswith('/') else x.strip()
        for x in (product.image_url or "").split(",") if x.strip()
    ]

    return jsonify({'message': 'Thêm sản phẩm thành công', 'id': product.id, 'images': images}), 201

@app.route('/seller/<int:seller_id>/product/<int:product_id>', methods=['PUT'])
def update_product(seller_id, product_id):
    product = Product.query.filter_by(id=product_id, seller_id=seller_id).first_or_404()
    data = request.get_json()

    if 'category_id' in data:
        category = db.session.get(Category, data['category_id'])
        if category:
            product.category_id = data['category_id']

    product.name = data.get('name', product.name)
    product.description = data.get('description', product.description)
    product.price = data.get('price', product.price)
    product.stock_quantity = data.get('stock_quantity', product.stock_quantity)
    if 'images' in data:
        product.image_url = ",".join(data['images'])
    if 'status' in data:
        try:
            product.status = ProductStatus(data['status'])
        except ValueError:
            pass

    product.updated_at = now_vn()
    db.session.commit()

    images = [
        f"http://10.0.2.2:5000{x.strip()}" if x.strip().startswith('/') else x.strip()
        for x in (product.image_url or "").split(",") if x.strip()
    ]

    return jsonify({'message': 'Cập nhật sản phẩm thành công', 'images': images}), 200

@app.route('/seller/<int:seller_id>/product/<int:product_id>', methods=['DELETE'])
def delete_product(seller_id, product_id):
    product = Product.query.filter_by(id=product_id, seller_id=seller_id).first_or_404()
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Xóa sản phẩm thành công'}), 200

@app.route('/dashboard/stats', methods=['GET'])
def dashboard_stats():
    user_id = request.args.get('user_id', type=int)
    role = request.args.get('role', 'seller')
    period = request.args.get('period', 'today')

    if not user_id:
        return jsonify({'error': 'Thiếu user_id'}), 400

    if role != 'seller':
        return jsonify({'error': 'Chỉ hỗ trợ cho seller'}), 403

    today = datetime.utcnow().date()
    start_date = today

    if period == 'week':
        start_date = today - timedelta(days=7)
    elif period == 'month':
        start_date = today - timedelta(days=30)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(today, datetime.max.time()) + timedelta(seconds=86399)

    from sqlalchemy import func

    total_views = (
        db.session.query(func.sum(Product.view_count))
        .filter(Product.seller_id == user_id)
        .scalar() or 0
    )

    new_orders = (
        db.session.query(func.count(func.distinct(OrderItem.order_id)))
        .join(Order)
        .join(Product)
        .filter(
            Product.seller_id == user_id,
            Order.created_at >= start_datetime,
            Order.created_at <= end_datetime
        )
        .scalar() or 0
    )

    revenue = (
        db.session.query(func.sum(OrderItem.subtotal))
        .join(Order)
        .join(Product)
        .filter(
            Product.seller_id == user_id,
            Order.created_at >= start_datetime,
            Order.created_at <= end_datetime
        )
        .scalar() or 0
    )

    return jsonify({
        'views': int(total_views),
        'new_orders': int(new_orders),
        'revenue': float(revenue),
        'period': period,
    }), 200

@app.route('/dashboard/stats/period', methods=['GET'])
def dashboard_period_stats():
    user_id = request.args.get('user_id', type=int)
    period = request.args.get('period')

    if not user_id or period not in ['week', 'month']:
        return jsonify({'error': 'Thiếu tham số hoặc period không hợp lệ'}), 400

    today = datetime.utcnow()
    if period == 'week':
        start_date = today - timedelta(days=7)
    else:
        start_date = today - timedelta(days=30)

    orders = Order.query.filter(
        Order.buyer_id == user_id,
        Order.created_at >= start_date
    ).all()

    total_orders = len(orders)
    total_revenue = sum(o.total_amount for o in orders) or 0

    return jsonify({
        'orders': total_orders,
        'revenue': float(total_revenue)
    }), 200


#admin
@app.route('/admin/stats', methods=['GET'])
def admin_stats():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    query_start = datetime.min
    query_end = datetime.max
    if start_date_str:
        try:
            query_start = datetime.strptime(start_date_str, '%Y-%m-%d')
        except ValueError:
            pass
    if end_date_str:
        try:
            query_end = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
        except ValueError:
            pass

    gmv = db.session.query(func.coalesce(func.sum(Order.total_amount), 0))\
        .filter(Order.created_at >= query_start, Order.created_at < query_end)\
        .scalar() or 0

    buyers_active = db.session.query(Order.buyer_id.label('user_id'))\
        .filter(Order.created_at >= query_start, Order.created_at < query_end)

    sellers_active = db.session.query(Product.seller_id.label('user_id'))\
        .filter(Product.created_at >= query_start, Product.created_at < query_end)

    dau_subq = buyers_active.union_all(sellers_active).subquery()
    dau = db.session.query(func.count(func.distinct(dau_subq.c.user_id))).scalar() or 0

    mau_start = datetime.utcnow() - timedelta(days=30)
    buyers_monthly = db.session.query(Order.buyer_id.label('user_id'))\
        .filter(Order.created_at >= mau_start)
    sellers_monthly = db.session.query(Product.seller_id.label('user_id'))\
        .filter(Product.created_at >= mau_start)

    mau_subq = buyers_monthly.union_all(sellers_monthly).subquery()
    mau = db.session.query(func.count(func.distinct(mau_subq.c.user_id))).scalar() or 0

    pending_products = db.session.query(func.count(Product.id))\
        .filter(
            Product.status == ProductStatus.waiting_for_approve,
            Product.created_at >= query_start,
            Product.created_at < query_end
        )\
        .scalar() or 0

    return jsonify({
        'gmv': float(gmv),
        'dau': int(dau),
        'mau': int(mau),
        'pending_products': int(pending_products),
    }), 200

@app.route('/admin/products', methods=['GET'])
def admin_products():
    status_str = request.args.get('status', 'waiting_for_approve')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    status_map = {
        'waiting_for_approve': ProductStatus.waiting_for_approve,
        'approved': ProductStatus.approved,
        'rejected': ProductStatus.rejected,
    }

    status_enum = status_map.get(status_str)
    if not status_enum:
        return jsonify({'error': 'Invalid status filter'}), 400

    query = Product.query.filter_by(status=status_enum).order_by(Product.created_at.desc())

    total = query.count()
    products = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for p in products:
        seller = p.seller
        image_path = p.image_url.split(',')[0].strip() if p.image_url else ''
        full_image_url = f'http://10.0.2.2:5000{image_path}' if image_path.startswith('/') else image_path

        result.append({
            'id': p.id,
            'name': p.name,
            'price': float(p.price),
            'description': p.description or '',
            'seller_name': seller.shop_name if seller else 'Unknown',
            'created_at': to_vn_date(p.created_at),
            'image_url': full_image_url,
            'status': p.status.value, 
        })

    return jsonify({
        'products': result,
        'total_pages': (total + per_page - 1) // per_page,
        'current_page': page,
        'total': total
    }), 200


@app.route('/admin/product/<int:product_id>/status', methods=['PATCH'])
def admin_update_product_status(product_id):
    data = request.get_json()
    new_status = data.get('status')

    if not new_status:
        return jsonify({'error': 'Thiếu trường status'}), 400

    try:
        status_enum = ProductStatus(new_status)
    except ValueError:
        return jsonify({'error': 'Trạng thái không hợp lệ'}), 400

    product = Product.query.get_or_404(product_id)
    product.status = status_enum
    db.session.commit()

    return jsonify({
        'message': 'Cập nhật trạng thái thành công',
        'new_status': new_status
    }), 200

@app.route('/admin/users', methods=['GET'])
def admin_users():
    search = request.args.get('search', '').strip()
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    buyer_q = db.session.query(
        Buyer.id.label('id'),
        Buyer.full_name.label('name'),
        Buyer.phone_number.label('phone'),
        Buyer.is_active.label('is_active'),
        literal('buyer').label('type'),
        literal(None).label('avatar')  
    )

    seller_q = db.session.query(
        Seller.id.label('id'),
        Seller.shop_name.label('name'),
        Seller.phone_number.label('phone'),
        Seller.is_active.label('is_active'),
        literal('seller').label('type'),
        Seller.avatar.label('avatar')  
    )

    if search:
        pattern = f"%{search}%"
        buyer_q = buyer_q.filter(or_(Buyer.full_name.ilike(pattern), Buyer.phone_number.ilike(pattern)))
        seller_q = seller_q.filter(or_(Seller.shop_name.ilike(pattern), Seller.phone_number.ilike(pattern)))

    if status in ('active', 'banned'):
        is_active = status == 'active'
        buyer_q = buyer_q.filter(Buyer.is_active == is_active)
        seller_q = seller_q.filter(Seller.is_active == is_active)

    combined = buyer_q.union_all(seller_q)
    total = combined.count()
    users = combined.offset((page - 1) * per_page).limit(per_page).all()

    result = [{
        'id': u.id,
        'name': u.name or '',
        'phone': u.phone or '',
        'status': 'active' if u.is_active else 'banned',
        'type': u.type,
        'avatar': u.avatar  
    } for u in users]

    return jsonify({
        'users': result,
        'total': total,
        'current_page': page,
        'total_pages': (total + per_page - 1) // per_page if per_page else 1,
        'per_page': per_page
    }), 200

@app.route('/admin/user/<string:user_type>/<int:user_id>/status', methods=['PATCH'])
def admin_update_user_status(user_type, user_id):
    data = request.get_json(silent=True) or {}

    if 'is_active' not in data or not isinstance(data['is_active'], bool):
        return jsonify({'error': 'Field "is_active" is required and must be boolean'}), 400

    if user_type not in ('buyer', 'seller'):
        return jsonify({'error': 'Invalid user type. Must be "buyer" or "seller"'}), 400

    model = Buyer if user_type == 'buyer' else Seller
    user = model.query.get(user_id)

    if not user:
        return jsonify({'error': f'{user_type.capitalize()} with id {user_id} not found'}), 404

    user.is_active = data['is_active']
    db.session.commit()

    return jsonify({
        'message': 'Status updated successfully',
        'user_id': user_id,
        'type': user_type,
        'new_status': 'active' if user.is_active else 'banned'
    }), 200

if __name__ == '__main__':
    app.run(debug=True)