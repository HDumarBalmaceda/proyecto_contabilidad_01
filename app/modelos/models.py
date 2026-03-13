from app import db
from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

# 1. TABLA INTERMEDIA (Corregida)
colegio_proveedor = db.Table('colegio_proveedor',
    db.Column('colegio_id', db.Integer, db.ForeignKey('colegios.id', ondelete='CASCADE'), primary_key=True),
    db.Column('proveedor_id', db.Integer, db.ForeignKey('proveedores.id', ondelete='CASCADE'), primary_key=True)
)

# -------------------------
# NUEVO: Modelo de Usuarios
# -------------------------
class Usuario(db.Model, UserMixin):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    rol = db.Column(db.String(20), default='contador', nullable=False)
    proveedores = db.relationship('Proveedor', backref='creador_rel', lazy=True)
    
    # NUEVOS CAMPOS
    email = db.Column(db.String(120), unique=True, nullable=True) # Opcional para admin
    telefono = db.Column(db.String(20), nullable=True)
    
    colegios = db.relationship('Colegio', backref='contador', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# -------------------------
# Modelo: Proveedor
# -------------------------
class Proveedor(db.Model):
    __tablename__ = 'proveedores'
    id = db.Column(db.Integer, primary_key=True)
    # NUEVA COLUMNA: Para saber qué usuario creó este proveedor
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False, index=True)
    tipo_tercero = db.Column(db.String(50), nullable=False)
    documento = db.Column(db.String(20),  nullable=False, index=True)
    dv = db.Column(db.String(1))
    renta = db.Column(db.String(50))
    primer_nombre = db.Column(db.String(100))
    segundo_nombre = db.Column(db.String(100))
    primer_apellido = db.Column(db.String(100))
    segundo_apellido = db.Column(db.String(100))
    razon_social = db.Column(db.String(255))
    direccion = db.Column(db.String(255))
    departamento = db.Column(db.String(100))
    ciudad = db.Column(db.String(100))
    telefono = db.Column(db.String(50))
    movil = db.Column(db.String(50))
    correo_electronico = db.Column(db.String(150))
    banco = db.Column(db.String(100))
    no_cuenta = db.Column(db.String(50))
    fecha_registro = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        nombre = self.razon_social if self.razon_social else f"{self.primer_nombre} {self.primer_apellido}"
        return f'<Proveedor {nombre}>'

# -------------------------
# Modelo: Colegio
# -------------------------
class Colegio(db.Model):
    __tablename__ = 'colegios'
    id = db.Column(db.Integer, primary_key=True)
    # --- NUEVA COLUMNA: Relaciona el colegio con un contador ---
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True, index=True)
    nombre = db.Column(db.String(200), nullable=False)
    nit = db.Column(db.String(50), unique=True, index=True)
    direccion = db.Column(db.Text)
    telefono = db.Column(db.String(50))
    municipio = db.Column(db.String(100))
    rector_nombre = db.Column(db.String(150))
    rector_documento = db.Column(db.String(50))
    rector_tipo_documento = db.Column(
        db.Enum('CC', 'CE', 'TI', 'PAS', 'OTRO', name='doc_type'),
        nullable=False,
        default='CC'
    )
    logo_path = db.Column(db.String(500))
    firma_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), onupdate=db.func.now())

    proveedores = db.relationship('Proveedor', 
                                 secondary=colegio_proveedor, 
                                 backref=db.backref('colegios_vinculados', lazy='dynamic'))
    procesos = db.relationship('ProcesoContractual', 
                               backref='colegio', 
                               cascade="all, delete-orphan",
                               passive_deletes=True)

    def __repr__(self):
        return f"<Colegio {self.nombre}>"

# -------------------------
# Modelo: ProcesoContractual
# -------------------------
class ProcesoContractual(db.Model):
    __tablename__ = 'procesos_contractuales'
    id = db.Column(db.Integer, primary_key=True)
    colegio_id = db.Column(db.Integer, db.ForeignKey('colegios.id'), nullable=False)
    
    # Proveedores
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'), nullable=False)
    proveedor2_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'), nullable=True)
    proveedor3_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'), nullable=True)
    
    # NUEVOS CAMPOS: Valores de propuestas adicionales
    valor_propuesta2 = db.Column(db.Float, default=0.0)
    valor_propuesta3 = db.Column(db.Float, default=0.0)
    promedio_propuestas = db.Column(db.Float)
    gran_total = db.Column(db.Float, default=0.0)

    vigencia = db.Column(db.String(4))
    tipo_contrato = db.Column(db.String(100))
    objeto_desc = db.Column(db.Text)
    cdp_numero = db.Column(db.String(50))
    cod_presupuestal = db.Column(db.String(100))
    plazo_txt = db.Column(db.String(200))
    rubro_nombre = db.Column(db.String(200))
    numero_proceso_colegio = db.Column(db.Integer)
    
    # Fechas
    f_elaboracion = db.Column(db.Date)
    f_publicacion = db.Column(db.Date)
    f_recepcion = db.Column(db.Date)
    f_cierre = db.Column(db.Date)
    f_verificacion = db.Column(db.Date)
    f_firma = db.Column(db.Date)
    f_recibido = db.Column(db.Date) # <<< NUEVA FECHA AGREGADA
    
    fecha_creacion = db.Column(db.DateTime, default=db.func.current_timestamp())

    detalles_items = db.relationship('ItemProceso', backref='proceso', cascade="all, delete-orphan")

# -------------------------
# Modelo: ItemProceso
# -------------------------
class ItemProceso(db.Model):
    __tablename__ = 'items_proceso'
    id = db.Column(db.Integer, primary_key=True)
    proceso_id = db.Column(db.Integer, db.ForeignKey('procesos_contractuales.id', ondelete='CASCADE'), nullable=False)
    codigo_clasificador = db.Column(db.String(50))
    cantidad = db.Column(db.Float, default=1.0)
    descripcion = db.Column(db.Text, nullable=False)
    v_unitario = db.Column(db.Float, default=0.0)
    v_total = db.Column(db.Float, default=0.0)