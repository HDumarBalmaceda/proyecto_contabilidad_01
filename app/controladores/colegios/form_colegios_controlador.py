import os
from flask import Blueprint, request, render_template, url_for, flash, redirect, jsonify
from app import db
from app.modelos.models import Colegio, Proveedor
from sqlalchemy.exc import IntegrityError
from flask_login import login_required, current_user

# Crear blueprint para colegios
colegios_bp = Blueprint('colegios', __name__, url_prefix='/colegios')

# 1. RUTA PARA MOSTRAR LA PÁGINA PRINCIPAL
@colegios_bp.route('/')
@login_required
def mostrar_colegios():
    if current_user.rol == 'admin':
        # El admin ve todo
        colegios = Colegio.query.all()
    else:
        # El contador solo ve los que le asignaste en el panel de enlace
        colegios = Colegio.query.filter_by(usuario_id=current_user.id).all()

    return render_template('colegios/colegios.html', colegios=colegios)

# 2. RUTA PARA CREAR COLEGIO
@colegios_bp.route('/crear', methods=['POST'])
@login_required
def crear_colegio():
    # EL BLOQUEO: Si no es admin, no pasa de aquí
    if current_user.rol != 'admin':
        return jsonify({"status": "error", "message": "Acceso denegado"}), 403

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

@colegios_bp.route('/<int:id>')
@login_required
def detalle_colegio(id):
    colegio = Colegio.query.get_or_404(id)
    
    # 1. SEGURIDAD: ¿Este colegio le pertenece al usuario o es admin?
    if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
        abort(403)

    # 2. FILTRAR PROVEEDORES YA VINCULADOS
    # Aquí está el truco: colegio.proveedores trae TODOS. 
    # Nosotros creamos una lista nueva que solo tenga los del usuario actual.
    if current_user.rol == 'admin':
        proveedores_vinculados = colegio.proveedores
    else:
        # Solo incluimos en la lista los proveedores cuyo creador sea el usuario actual
        proveedores_vinculados = [p for p in colegio.proveedores if p.usuario_id == current_user.id]

    # 3. FILTRAR PROVEEDORES DISPONIBLES PARA EL SELECT (Los que aún no se vinculan)
    # Obtenemos los IDs de TODOS los proveedores vinculados para que no aparezcan en el select
    ids_vinculados_totales = [p.id for p in colegio.proveedores]
    
    if current_user.rol == 'admin':
        query = Proveedor.query
    else:
        # El contador solo puede ver sus propios proveedores creados
        query = Proveedor.query.filter_by(usuario_id=current_user.id)
    
    # Excluimos los que ya están en la tabla intermedia
    if ids_vinculados_totales:
        query = query.filter(Proveedor.id.notin_(ids_vinculados_totales))
    
    todos_los_proveedores = query.order_by(Proveedor.id.desc()).all()
    
    # 4. ENVIAR TODO AL TEMPLATE
    return render_template('perfil_colegios/perfil_colegio.html', 
                           colegio=colegio, 
                           proveedores_vinculados=proveedores_vinculados, # <--- LISTA FILTRADA
                           todos_los_proveedores=todos_los_proveedores)
# 4. RUTA PARA EDITAR
@colegios_bp.route('/editar/<int:id>', methods=['POST'])
@login_required
def editar_colegio(id):
    try:
        colegio = Colegio.query.get_or_404(id)

        # Validación de pertenencia: Admin o dueño
        if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
            return jsonify({
                "status": "error", 
                "message": "No tienes permiso para modificar este colegio."
            }), 403

        # Actualización de campos básicos
        colegio.nombre = request.form.get('nombre')
        colegio.nit = request.form.get('nit')
        colegio.direccion = request.form.get('direccion')
        colegio.telefono = request.form.get('telefono')
        colegio.municipio = request.form.get('municipio')
        colegio.rector_nombre = request.form.get('rector_nombre')
        colegio.rector_documento = request.form.get('rector_documento')
        colegio.rector_tipo_documento = request.form.get('rector_tipo_documento')

        upload_folder = os.path.join("app", "static", "uploads")
        
        # Procesar Logo si se sube uno nuevo
        logo_file = request.files.get('logo_path')
        if logo_file and logo_file.filename != '':
            logo_filename = f"logo_{colegio.nombre.replace(' ', '_')}.png"
            logo_file.save(os.path.join(upload_folder, logo_filename))
            colegio.logo_path = logo_filename

        # Procesar Firma si se sube una nueva
        firma_file = request.files.get('firma_path')
        if firma_file and firma_file.filename != '':
            firma_filename = f"firma_{colegio.nombre.replace(' ', '_')}.png"
            firma_file.save(os.path.join(upload_folder, firma_filename))
            colegio.firma_path = firma_filename

        db.session.commit()
        return jsonify({"status": "success", "message": "Colegio actualizado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# 5. RUTA PARA ELIMINAR (Solo Admin)
@colegios_bp.route('/eliminar/<int:id>', methods=['DELETE'])
@login_required
def eliminar_colegio(id):
    # El bloqueo de seguridad debe estar al mismo nivel que el resto del código
    if current_user.rol != 'admin':
        return jsonify({
            "status": "error", 
            "message": "Solo el administrador puede eliminar colegios"
        }), 403
    
    try:
        colegio = Colegio.query.get_or_404(id)
        db.session.delete(colegio)
        db.session.commit()
        return jsonify({"status": "success", "message": "Colegio eliminado"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# 6. VINCULAR PROVEEDOR (CORREGIDA CON DOBLE BLINDAJE)
@colegios_bp.route('/vincular-proveedor/<int:colegio_id>', methods=['POST'])
@login_required
def vincular_proveedor(colegio_id):
    try:
        colegio = Colegio.query.get_or_404(colegio_id)
        
        # Seguridad 1: Solo puedes vincular si eres admin o el colegio te pertenece
        if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
            return jsonify({"status": "error", "message": "Acceso no autorizado al colegio"}), 403

        proveedor_id = request.form.get('proveedor_id')
        if not proveedor_id:
            return jsonify({"status": "error", "message": "No seleccionaste ningún proveedor"}), 400
            
        # Seguridad 2: Buscamos el proveedor pero FILTRANDO por el dueño actual
        # Así, aunque envíen un ID de otro contador, la consulta dará 404
        if current_user.rol == 'admin':
            proveedor = Proveedor.query.get(proveedor_id)
        else:
            proveedor = Proveedor.query.filter_by(id=proveedor_id, usuario_id=current_user.id).first()

        if not proveedor:
            return jsonify({"status": "error", "message": "El proveedor no existe o no te pertenece"}), 404
        
        if proveedor not in colegio.proveedores:
            colegio.proveedores.append(proveedor)
            db.session.commit()
            return jsonify({"status": "success", "message": "Proveedor vinculado"}), 200
            
        return jsonify({"status": "error", "message": "El proveedor ya está vinculado"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# 7. DESVINCULAR PROVEEDOR
@colegios_bp.route('/desvincular-proveedor/<int:colegio_id>/<int:proveedor_id>', methods=['POST'])
@login_required
def desvincular_proveedor(colegio_id, proveedor_id):
    try:
        # 1. Buscamos el colegio
        colegio = Colegio.query.get_or_404(colegio_id)
        
        # 2. VALIDACIÓN DE SEGURIDAD
        # Si no es admin y el colegio no es suyo, bloqueamos la acción
        if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
            return jsonify({
                "status": "error", 
                "message": "No tienes permiso para modificar los vínculos de este colegio."
            }), 403

        # 3. Buscamos el proveedor
        proveedor = Proveedor.query.get_or_404(proveedor_id)
        
        # 4. Eliminamos el vínculo si existe
        if proveedor in colegio.proveedores:
            colegio.proveedores.remove(proveedor)
            db.session.commit()
            return jsonify({"status": "success", "message": "Vínculo eliminado correctamente"}), 200
            
        return jsonify({"status": "error", "message": "Este proveedor no estaba vinculado a este colegio"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@colegios_bp.route('/admin_colegios')
@login_required
def vista_admin_colegios():
    # 1. Seguridad: Solo el admin entra
    if current_user.rol != 'admin':
        return redirect(url_for('index'))
    
    from app.modelos.models import Colegio, Usuario
    
    # 2. Obtener todos los colegios con sus relaciones
    # Usamos .joinedload si quieres optimizar, pero .all() funciona bien para 165 registros
    colegios = Colegio.query.order_by(Colegio.nombre.asc()).all()
    
    # 3. Datos para las Tarjetas de Resumen (Stats)
    total_colegios = len(colegios)
    asignados = Colegio.query.filter(Colegio.usuario_id.isnot(None)).count()
    pendientes = total_colegios - asignados
    
    # 4. Obtener lista de contadores para el futuro Modal de creación/edición
    contadores = Usuario.query.filter(Usuario.rol != 'admin').all()
    
    return render_template('admin_colegios/admin_colegios.html', 
                           colegios=colegios, 
                           stats={
                               "total": total_colegios,
                               "asignados": asignados,
                               "pendientes": pendientes
                           },
                           contadores=contadores)