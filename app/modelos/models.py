from app import db
from datetime import datetime

# 1. TABLA INTERMEDIA
colegio_proveedor = db.Table('colegio_proveedor',
    db.Column('colegio_id', db.Integer, db.ForeignKey('colegios.id'), primary_key=True),
    db.Column('proveedor_id', db.Integer, db.ForeignKey('proveedores.id'), primary_key=True)
)

# -------------------------
# Modelo: Colegio
# -------------------------
class Colegio(db.Model):
    __tablename__ = 'colegios'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    nit = db.Column(db.String(50), unique=True)
    direccion = db.Column(db.Text)
    telefono = db.Column(db.String(50))
    municipio = db.Column(db.String(100))
    rector_nombre = db.Column(db.String(150))
    rector_documento = db.Column(db.String(50))
    rector_tipo_documento = db.Column(
        db.Enum('CC', 'CE', 'TI', 'PAS', 'OTRO', name='doc_type', create_type=False),
        nullable=False,
        default='CC'
    )
    logo_path = db.Column(db.String(500))
    firma_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), onupdate=db.func.now())

    # --- CAMBIO AQUÍ: Relación con Proveedores (secondary no lleva cascade) ---
    proveedores = db.relationship('Proveedor', secondary=colegio_proveedor, backref='colegios_vinculados')

    # --- NUEVA LÍNEA: Relación en cascada con Procesos Contractuales ---
    # Esto borrará todos los procesos si el colegio se elimina
    procesos = db.relationship('ProcesoContractual', 
                               backref='colegio', 
                               cascade="all, delete-orphan",
                               passive_deletes=True)

    def __repr__(self):
        return f"<Colegio {self.nombre}>"

# -------------------------
# Modelo: Proveedor
# -------------------------
class Proveedor(db.Model):
    __tablename__ = 'proveedores'
    # ... (Se mantiene igual tu código de proveedor)
    id = db.Column(db.Integer, primary_key=True)
    tipo_tercero = db.Column(db.String(50), nullable=False)
    documento = db.Column(db.String(20), unique=True, nullable=False)
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
# Modelo: ItemProceso
# -------------------------
class ItemProceso(db.Model):
    __tablename__ = 'items_proceso'
    id = db.Column(db.Integer, primary_key=True)
    # ondelete='CASCADE' asegura que si se borra el proceso, se borren los ítems en la DB
    proceso_id = db.Column(db.Integer, db.ForeignKey('procesos_contractuales.id', ondelete='CASCADE'), nullable=False)
    codigo_clasificador = db.Column(db.String(50))
    cantidad = db.Column(db.Float, default=1.0)
    descripcion = db.Column(db.Text, nullable=False)
    v_unitario = db.Column(db.Float, default=0.0)
    v_total = db.Column(db.Float, default=0.0)

# -------------------------
# Modelo: ProcesoContractual
# -------------------------
class ProcesoContractual(db.Model):
    __tablename__ = 'procesos_contractuales'
    
    id = db.Column(db.Integer, primary_key=True)
    vigencia = db.Column(db.Integer, nullable=False)
    tipo_contrato = db.Column(db.String(100))
    objeto_desc = db.Column(db.Text)
    
    f_elaboracion = db.Column(db.Date)
    f_publicacion = db.Column(db.Date)
    f_recepcion = db.Column(db.Date)
    f_cierre = db.Column(db.Date)
    f_verificacion = db.Column(db.Date)
    f_firma = db.Column(db.Date)
    plazo_txt = db.Column(db.String(200))
    cdp_numero = db.Column(db.String(100))
    cod_presupuestal = db.Column(db.String(100))
    
    # --- CAMBIO AQUÍ: ondelete='CASCADE' ---
    colegio_id = db.Column(db.Integer, db.ForeignKey('colegios.id', ondelete='CASCADE'), nullable=False)
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'), nullable=False)
    
    # Relación con ítems (también en cascada)
    detalles_items = db.relationship('ItemProceso', backref='proceso_rel', cascade="all, delete-orphan", passive_deletes=True)
    
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)