from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from app import db
from app.modelos.models import Proveedor 
from app.modelos.models import Colegio
from sqlalchemy.exc import IntegrityError
from flask_login import login_required, current_user

proveedores_bp = Blueprint('proveedores', __name__, url_prefix='/proveedores')

from flask import session, jsonify # Asegúrate de importar session
from app.modelos.models import Colegio # Y el modelo Colegio

@proveedores_bp.route('/', methods=['GET', 'POST'])
@login_required
def listar_proveedores():
    colegio_id = session.get('colegio_id')
    
    # --- LÓGICA DE PROCESAMIENTO (POST) ---
    if request.method == 'POST':
        documento = request.form.get('documento')
        try:
            proveedor = Proveedor.query.filter_by(documento=documento).first()

            if not proveedor:
                proveedor = Proveedor(
                    usuario_id=current_user.id,
                    tipo_tercero=request.form.get('tipo_tercero'),
                    documento=documento,
                    dv=request.form.get('dv'),
                    razon_social=request.form.get('razon_social'),
                    primer_nombre=request.form.get('primer_nombre'),
                    segundo_nombre=request.form.get('segundo_nombre'),
                    primer_apellido=request.form.get('primer_apellido'),
                    segundo_apellido=request.form.get('segundo_apellido'),
                    direccion=request.form.get('direccion'),
                    departamento=request.form.get('departamento'),
                    ciudad=request.form.get('ciudad'),
                    correo_electronico=request.form.get('correo_electronico'),
                    movil=request.form.get('movil'),
                    renta=request.form.get('renta'),
                    banco=request.form.get('banco'),
                    no_cuenta=request.form.get('no_cuenta')
                )
                db.session.add(proveedor)
                db.session.flush() 
                mensaje_final = 'Proveedor registrado exitosamente.'
            else:
                mensaje_final = 'Proveedor existente.'

            if colegio_id:
                colegio = Colegio.query.get(colegio_id)
                if colegio and proveedor not in colegio.proveedores:
                    colegio.proveedores.append(proveedor)
            
            db.session.commit()
            flash(mensaje_final, 'success')

        except Exception as e:
            db.session.rollback()
            flash(f'Error: {str(e)}', 'danger')
        
        return redirect(url_for('proveedores.listar_proveedores'))

    # --- LÓGICA DE FILTRADO DE DATOS ---
    if current_user.rol == 'admin':
        proveedores = Proveedor.query.all()
        # RENDERIZADO PARA EL ADMIN (La nueva vista con base.html)
        return render_template('admin_proveedor/admin_proveedor.html', proveedores=proveedores)
    
    else:
        # Lógica para contadores
        if colegio_id:
            colegio = Colegio.query.get(colegio_id)
            proveedores = colegio.proveedores if colegio else []
        else:
            proveedores = Proveedor.query.filter_by(usuario_id=current_user.id).all()
        
        # RENDERIZADO PARA EL CONTADOR (La vista original/específica)
        return render_template('proveedores/proveedores.html', proveedores=proveedores)

@proveedores_bp.route('/editar/<int:id>', methods=['POST'])
@login_required
def editar_proveedor(id):
    # 1. BLINDAJE TOTAL: Si no es admin, fuera.
    if current_user.rol != 'admin':
        flash('Acceso denegado: Solo el administrador puede modificar la información maestra de los proveedores.', 'danger')
        return redirect(url_for('proveedores.listar_proveedores'))

    # 2. Si llegó aquí, es admin. Buscamos el proveedor.
    proveedor = Proveedor.query.get_or_404(id)

    try:
        # 3. Actualización de todos los campos
        proveedor.tipo_tercero = request.form.get('tipo_tercero')
        proveedor.documento = request.form.get('documento')
        proveedor.dv = request.form.get('dv')
        proveedor.razon_social = request.form.get('razon_social')
        proveedor.primer_nombre = request.form.get('primer_nombre')
        proveedor.segundo_nombre = request.form.get('segundo_nombre')
        proveedor.primer_apellido = request.form.get('primer_apellido')
        proveedor.segundo_apellido = request.form.get('segundo_apellido')
        proveedor.direccion = request.form.get('direccion')
        proveedor.departamento = request.form.get('departamento')
        proveedor.ciudad = request.form.get('ciudad')
        proveedor.correo_electronico = request.form.get('correo_electronico')
        proveedor.movil = request.form.get('movil')
        proveedor.renta = request.form.get('renta')
        proveedor.banco = request.form.get('banco')
        proveedor.no_cuenta = request.form.get('no_cuenta')

        db.session.commit()
        flash('Información del proveedor actualizada correctamente por el administrador.', 'success')

    except IntegrityError:
        db.session.rollback()
        flash('Error: El número de documento ya existe en el sistema.', 'danger')
    except Exception as e:
        db.session.rollback()
        flash(f'Error inesperado al actualizar: {str(e)}', 'danger')
    
    return redirect(url_for('proveedores.listar_proveedores'))

@proveedores_bp.route('/eliminar/<int:id>')
@login_required
def eliminar_proveedor(id):
    # 1. BLINDAJE DE SEGURIDAD: Solo el admin puede entrar aquí
    if current_user.rol != 'admin':
        flash('Acceso denegado: Solo el administrador puede eliminar proveedores del catálogo maestro.', 'danger')
        return redirect(url_for('proveedores.listar_proveedores'))

    # 2. Si es admin, buscamos el proveedor
    proveedor = Proveedor.query.get_or_404(id)
    
    try:
        # 3. Borrado físico de la base de datos
        db.session.delete(proveedor)
        db.session.commit()
        flash('Proveedor eliminado permanentemente del sistema.', 'warning')

    except Exception as e:
        db.session.rollback()
        # Esto protege la integridad si el proveedor ya tiene facturas o registros
        flash('No se puede eliminar: el proveedor tiene registros contables asociados en uno o más colegios.', 'danger')
    
    return redirect(url_for('proveedores.listar_proveedores'))

@proveedores_bp.route('/obtener/<int:id>')
@login_required
def obtener_proveedor_json(id):
    # 1. Buscamos el proveedor globalmente
    p = Proveedor.query.get_or_404(id)
    
    # 2. Validación de seguridad para contadores
    if current_user.rol != 'admin':
        colegio_id = session.get('colegio_id')
        colegio = Colegio.query.get(colegio_id)
        
        # Si el proveedor no está en su colegio, no debería ver los datos
        if not colegio or p not in colegio.proveedores:
            return {"error": "No autorizado"}, 403

    # 3. Retorno de datos (se mantiene igual, es perfecto)
    return {
        "tipo_tercero": p.tipo_tercero,
        "documento_full": f"{p.documento}-{p.dv}" if p.dv else p.documento,
        "razon_social": p.razon_social or "N/A",
        "p_nombre": p.primer_nombre or "-",
        "s_nombre": p.segundo_nombre or "-",
        "p_apellido": p.primer_apellido or "-",
        "s_apellido": p.segundo_apellido or "-",
        "direccion": p.direccion or "-",
        "ubicacion_full": f"{p.ciudad} / {p.departamento}",
        "movil": p.movil or "-",
        "correo": p.correo_electronico or "-",
        "renta": p.renta or "-",
        "banco": p.banco or "-",
        "cuenta": p.no_cuenta or "-"
    }