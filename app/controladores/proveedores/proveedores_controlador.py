from flask import Blueprint, render_template, request, redirect, url_for, flash
from app import db
from app.modelos.models import Proveedor 
from sqlalchemy.exc import IntegrityError # <--- ¡ESTA LÍNEA ES VITAL!

proveedores_bp = Blueprint('proveedores', __name__, url_prefix='/proveedores')

@proveedores_bp.route('/', methods=['GET', 'POST'])
def listar_proveedores():
    if request.method == 'POST':
        try:
            nuevo_proveedor = Proveedor(
                tipo_tercero=request.form.get('tipo_tercero'),
                documento=request.form.get('documento'),
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
            db.session.add(nuevo_proveedor)
            db.session.commit()
            flash('Proveedor registrado exitosamente', 'success')

        except IntegrityError:
            db.session.rollback()
            flash('Error: Ya existe un proveedor con este número de documento.', 'danger')

        except Exception as e:
            db.session.rollback()
            flash(f'Error al registrar: {str(e)}', 'danger')
        
        return redirect(url_for('proveedores.listar_proveedores'))

    proveedores = Proveedor.query.all()
    return render_template('proveedores/proveedores.html', proveedores=proveedores)

@proveedores_bp.route('/editar/<int:id>', methods=['POST'])
def editar_proveedor(id):
    proveedor = Proveedor.query.get_or_404(id)
    try:
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
        flash('Proveedor actualizado correctamente', 'success')

    except IntegrityError:
        db.session.rollback()
        flash('Error: El documento ingresado ya pertenece a otro proveedor.', 'danger')

    except Exception as e:
        db.session.rollback()
        flash(f'Error al actualizar: {str(e)}', 'danger')
    
    return redirect(url_for('proveedores.listar_proveedores'))

@proveedores_bp.route('/eliminar/<int:id>')
def eliminar_proveedor(id):
    proveedor = Proveedor.query.get_or_404(id)
    try:
        db.session.delete(proveedor)
        db.session.commit()
        flash('Proveedor eliminado correctamente', 'warning')

    except Exception as e:
        db.session.rollback()
        # Aquí el error suele ser por llaves foráneas (si el proveedor tiene facturas, etc.)
        flash('No se puede eliminar: el proveedor tiene registros asociados.', 'danger')
    
    return redirect(url_for('proveedores.listar_proveedores'))

# OBTIENE LOS DATOS DE LOS PROVEEDORES 
@proveedores_bp.route('/obtener/<int:id>')
def obtener_proveedor_json(id):
    p = Proveedor.query.get_or_404(id)
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