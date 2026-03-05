import os
from flask import Blueprint, request, render_template, url_for, flash, redirect, jsonify
from app import db
from app.modelos.models import Colegio, Proveedor
from sqlalchemy.exc import IntegrityError

# Crear blueprint para colegios
colegios_bp = Blueprint('colegios', __name__, url_prefix='/colegios')

# 1. RUTA PARA MOSTRAR LA PÁGINA PRINCIPAL
@colegios_bp.route('/')
def mostrar_colegios():
    colegios = Colegio.query.all()
    return render_template('colegios/colegios.html', colegios=colegios)

# 2. RUTA PARA CREAR COLEGIO
@colegios_bp.route('/crear', methods=['POST'])
def crear_colegio():
    try:
        nombre = request.form.get('nombre')
        nit = request.form.get('nit')
        direccion = request.form.get('direccion')
        telefono = request.form.get('telefono')
        municipio = request.form.get('municipio')
        rector_nombre = request.form.get('rector_nombre')
        rector_documento = request.form.get('rector_documento')
        rector_tipo_documento = request.form.get('rector_tipo_documento')

        upload_folder = os.path.join("app", "static", "uploads")
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        logo_file = request.files.get('logo_path')
        logo_filename = f"logo_{nombre.replace(' ', '_')}.png" if logo_file else None
        if logo_file: 
            logo_file.save(os.path.join(upload_folder, logo_filename))

        firma_file = request.files.get('firma_path')
        firma_filename = f"firma_{nombre.replace(' ', '_')}.png" if firma_file else None
        if firma_file: 
            firma_file.save(os.path.join(upload_folder, firma_filename))

        nuevo_colegio = Colegio(
            nombre=nombre, nit=nit, direccion=direccion, telefono=telefono,
            municipio=municipio, rector_nombre=rector_nombre,
            rector_documento=rector_documento, rector_tipo_documento=rector_tipo_documento,
            logo_path=logo_filename, firma_path=firma_filename
        )

        db.session.add(nuevo_colegio)
        db.session.commit()
        return jsonify({"status": "success", "message": "Colegio creado"}), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({"status": "error", "message": "Ya existe un colegio con este NIT o nombre."}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# 3. RUTA PARA EL DETALLE
@colegios_bp.route('/<int:id>')
def detalle_colegio(id):
    colegio = Colegio.query.get_or_404(id)
    ids_vinculados = [p.id for p in colegio.proveedores]
    query = Proveedor.query
    if ids_vinculados:
        query = query.filter(Proveedor.id.notin_(ids_vinculados))
    todos_los_proveedores = query.order_by(Proveedor.id.desc()).all()
    
    return render_template('perfil_colegios/perfil_colegio.html', 
                           colegio=colegio, 
                           todos_los_proveedores=todos_los_proveedores)

# 4. RUTA PARA EDITAR
@colegios_bp.route('/editar/<int:id>', methods=['POST'])
def editar_colegio(id):
    try:
        colegio = Colegio.query.get_or_404(id)
        colegio.nombre = request.form.get('nombre')
        colegio.nit = request.form.get('nit')
        colegio.direccion = request.form.get('direccion')
        colegio.telefono = request.form.get('telefono')
        colegio.municipio = request.form.get('municipio')
        colegio.rector_nombre = request.form.get('rector_nombre')
        colegio.rector_documento = request.form.get('rector_documento')
        colegio.rector_tipo_documento = request.form.get('rector_tipo_documento')

        upload_folder = os.path.join("app", "static", "uploads")
        
        logo_file = request.files.get('logo_path')
        if logo_file and logo_file.filename != '':
            logo_filename = f"logo_{colegio.nombre.replace(' ', '_')}.png"
            logo_file.save(os.path.join(upload_folder, logo_filename))
            colegio.logo_path = logo_filename

        firma_file = request.files.get('firma_path')
        if firma_file and firma_file.filename != '':
            firma_filename = f"firma_{colegio.nombre.replace(' ', '_')}.png"
            firma_file.save(os.path.join(upload_folder, firma_filename))
            colegio.firma_path = firma_filename

        db.session.commit()
        return jsonify({"status": "success", "message": "Colegio actualizado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# 5. RUTA PARA ELIMINAR
@colegios_bp.route('/eliminar/<int:id>', methods=['DELETE'])
def eliminar_colegio(id):
    try:
        colegio = Colegio.query.get_or_404(id)
        db.session.delete(colegio)
        db.session.commit()
        return jsonify({"status": "success", "message": "Colegio eliminado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# 6. VINCULAR PROVEEDOR
@colegios_bp.route('/vincular-proveedor/<int:colegio_id>', methods=['POST'])
def vincular_proveedor(colegio_id):
    try:
        colegio = Colegio.query.get_or_404(colegio_id)
        proveedor_id = request.form.get('proveedor_id')
        if not proveedor_id:
            return jsonify({"status": "error", "message": "No seleccionaste ningún proveedor"}), 400
        proveedor = Proveedor.query.get(proveedor_id)
        if proveedor and proveedor not in colegio.proveedores:
            colegio.proveedores.append(proveedor)
            db.session.commit()
            return jsonify({"status": "success", "message": "Proveedor vinculado"}), 200
        return jsonify({"status": "error", "message": "El proveedor ya está vinculado"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# 7. DESVINCULAR PROVEEDOR
@colegios_bp.route('/desvincular-proveedor/<int:colegio_id>/<int:proveedor_id>', methods=['POST'])
def desvincular_proveedor(colegio_id, proveedor_id):
    try:
        colegio = Colegio.query.get_or_404(colegio_id)
        proveedor = Proveedor.query.get_or_404(proveedor_id)
        if proveedor in colegio.proveedores:
            colegio.proveedores.remove(proveedor)
            db.session.commit()
            return jsonify({"status": "success", "message": "Vínculo eliminado"}), 200
        return jsonify({"status": "error", "message": "No se encontró el vínculo"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500