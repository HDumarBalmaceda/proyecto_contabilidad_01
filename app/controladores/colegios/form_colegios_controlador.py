import os
from flask import current_app
from flask import Blueprint, request, render_template, url_for, flash, redirect, jsonify
from app import db
from app.modelos.models import Colegio, Proveedor
from sqlalchemy.exc import IntegrityError
from flask_login import login_required, current_user
import traceback
from sqlalchemy import or_

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
    # 1. Seguridad
    if current_user.rol != 'admin':
        flash("Acceso denegado: No tienes permisos.", "danger")
        return redirect(url_for('colegios.vista_admin_colegios'))

    try:
        # --- DEBUG: Ver que llega del formulario ---
        print("\n" + "="*50)
        print("DEBUG: INICIANDO CREACIÓN DE COLEGIO")
        print("DATOS RECIBIDOS:", request.form)
        print("ARCHIVOS RECIBIDOS:", request.files)
        print("="*50)

        # 2. Captura de datos
        nombre = request.form.get('nombre')
        nit = request.form.get('nit')
        direccion = request.form.get('direccion')
        telefono = request.form.get('telefono')
        municipio = request.form.get('municipio')
        rector_nombre = request.form.get('rector_nombre')
        rector_documento = request.form.get('rector_documento')
        rector_tipo_documento = request.form.get('rector_tipo_documento')

        # 3. Manejo de archivos
        # Usamos current_app.root_path para evitar errores de rutas relativas
        upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
        
        if not os.path.exists(upload_folder):
            print(f"DEBUG: Creando carpeta de uploads en {upload_folder}")
            os.makedirs(upload_folder, exist_ok=True)

        # Limpiamos el nombre para el archivo (quitar espacios)
        nombre_limpio = nombre.replace(' ', '_') if nombre else "sin_nombre"

        # Procesar Logo
        logo_file = request.files.get('logo_path')
        logo_filename = None
        if logo_file and logo_file.filename != '':
            logo_filename = f"logo_{nombre_limpio}.png"
            logo_path_full = os.path.join(upload_folder, logo_filename)
            logo_file.save(logo_path_full)
            print(f"DEBUG: Logo guardado en {logo_path_full}")

        # Procesar Firma
        firma_file = request.files.get('firma_path')
        firma_filename = None
        if firma_file and firma_file.filename != '':
            firma_filename = f"firma_{nombre_limpio}.png"
            firma_path_full = os.path.join(upload_folder, firma_filename)
            firma_file.save(firma_path_full)
            print(f"DEBUG: Firma guardada en {firma_path_full}")

        # 4. Guardar en DB
        print("DEBUG: Creando objeto Colegio en SQLAlchemy...")
        nuevo_colegio = Colegio(
            nombre=nombre, 
            nit=nit, 
            direccion=direccion, 
            telefono=telefono,
            municipio=municipio, 
            rector_nombre=rector_nombre,
            rector_documento=rector_documento, 
            rector_tipo_documento=rector_tipo_documento if rector_tipo_documento else 'CC',
            logo_path=logo_filename, 
            firma_path=firma_filename
        )

        db.session.add(nuevo_colegio)
        print("DEBUG: Ejecutando db.session.commit()...")
        db.session.commit()
        
        print("DEBUG: ¡EXITO! Colegio guardado correctamente.")
        flash("¡Institución registrada exitosamente!", "success")
        return redirect(url_for('colegios.vista_admin_colegios'))

    except IntegrityError as e:
        db.session.rollback()
        print("---------- ERROR DE INTEGRIDAD (NIT DUPLICADO?) ----------")
        print(str(e))
        flash("Error: Ya existe un colegio con este NIT.", "danger")
        return redirect(url_for('colegios.vista_admin_colegios'))

    except Exception as e:
        db.session.rollback()
        print("\n" + "!"*50)
        print("---------- ERROR CRÍTICO DETECTADO ----------")
        # Esto imprime el error exacto y la línea donde ocurrió
        traceback.print_exc() 
        print("!"*50 + "\n")
        
        flash(f"Error inesperado: {str(e)}", "danger")
        return redirect(url_for('colegios.vista_admin_colegios'))

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

# 1. Definimos las extensiones permitidas fuera de la ruta
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
        nombre_limpio = "".join(x for x in colegio.nombre if x.isalnum() or x in "._- ").replace(' ', '_')

        # --- PROCESAR LOGO ---
        logo_file = request.files.get('logo_path')
        if logo_file and logo_file.filename != '':
            # A. Validar extensión
            if not allowed_file(logo_file.filename):
                return jsonify({"status": "error", "message": "Formato de logo no permitido"}), 400
            
            # B. Borrar logo anterior si existe físicamente
            if colegio.logo_path:
                old_path = os.path.join(upload_folder, colegio.logo_path)
                if os.path.exists(old_path):
                    os.remove(old_path)

            # C. Guardar nuevo logo
            ext = logo_file.filename.rsplit('.', 1)[1].lower()
            logo_filename = f"logo_{colegio.id}_{nombre_limpio}.{ext}"
            logo_file.save(os.path.join(upload_folder, logo_filename))
            colegio.logo_path = logo_filename

        # --- PROCESAR FIRMA ---
        firma_file = request.files.get('firma_path')
        if firma_file and firma_file.filename != '':
            # A. Validar extensión
            if not allowed_file(firma_file.filename):
                return jsonify({"status": "error", "message": "Formato de firma no permitido"}), 400

            # B. Borrar firma anterior si existe
            if colegio.firma_path:
                old_firma_path = os.path.join(upload_folder, colegio.firma_path)
                if os.path.exists(old_firma_path):
                    os.remove(old_firma_path)

            # C. Guardar nueva firma
            ext_f = firma_file.filename.rsplit('.', 1)[1].lower()
            firma_filename = f"firma_{colegio.id}_{nombre_limpio}.{ext_f}"
            firma_file.save(os.path.join(upload_folder, firma_filename))
            colegio.firma_path = firma_filename

        db.session.commit()
        return jsonify({"status": "success", "message": "Colegio actualizado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@colegios_bp.route('/eliminar/<int:id>', methods=['DELETE'])
@login_required
def eliminar_colegio(id):
    if current_user.rol != 'admin':
        return jsonify({
            "status": "error", 
            "message": "Solo el administrador puede eliminar colegios"
        }), 403
    
    try:
        colegio = Colegio.query.get_or_404(id)
        
        # --- CIRUGÍA DE ARCHIVOS FÍSICOS ---
        # Definimos la ruta de la carpeta de subidas
        upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
        
        # Lista de archivos a eliminar
        archivos_a_borrar = [colegio.logo_path, colegio.firma_path]
        
        for archivo in archivos_a_borrar:
            if archivo:
                # Construimos la ruta completa
                ruta_completa = os.path.join(upload_folder, archivo)
                # Si el archivo existe en el disco, lo borramos
                if os.path.exists(ruta_completa):
                    os.remove(ruta_completa)

        # --- ELIMINACIÓN EN BASE DE DATOS ---
        # Esto disparará el 'cascade delete' que configuramos en los modelos
        db.session.delete(colegio)
        db.session.commit()
        
        return jsonify({
            "status": "success", 
            "message": "Colegio, archivos y procesos eliminados correctamente"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error", 
            "message": f"Error al eliminar: {str(e)}"
        }), 500

# 6. VINCULAR PROVEEDOR (CORREGIDA CON DOBLE BLINDAJE)
@colegios_bp.route('/vincular-proveedor/<int:colegio_id>', methods=['POST'])
@login_required
def vincular_proveedor(colegio_id):
    try:
        colegio = Colegio.query.get_or_404(colegio_id)
        
        # Seguridad 1: Se mantiene (Solo el dueño del colegio o admin)
        if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
            return jsonify({"status": "error", "message": "Acceso no autorizado"}), 403

        proveedor_id = request.form.get('proveedor_id')
        
        # CAMBIO CLAVE: Buscamos el proveedor en TODA la base de datos
        # Ya no filtramos por usuario_id porque el registro es GENERAL
        proveedor = Proveedor.query.get(proveedor_id)

        if not proveedor:
            return jsonify({"status": "error", "message": "El proveedor no existe en el sistema"}), 404
        
        # La vinculación sigue igual (es perfecta)
        if proveedor not in colegio.proveedores:
            colegio.proveedores.append(proveedor)
            db.session.commit()
            return jsonify({"status": "success", "message": "Proveedor vinculado con éxito"}), 200
            
        return jsonify({"status": "info", "message": "Este proveedor ya estaba vinculado a este colegio"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

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
    if current_user.rol != 'admin':
        return redirect(url_for('index'))
    
    from app.modelos.models import Colegio, Usuario
    
    # Stats (Se mantienen estáticas para las tarjetas superiores)
    total_colegios = Colegio.query.count()
    asignados = Colegio.query.filter(Colegio.usuario_id.isnot(None)).count()
    
    # Lista de contadores para el select del modal
    contadores = Usuario.query.filter(Usuario.rol != 'admin').all()
    
    return render_template('admin_colegios/admin_colegios.html', 
                           stats={
                               "total": total_colegios,
                               "asignados": asignados,
                               "pendientes": total_colegios - asignados
                           },
                           contadores=contadores)

@colegios_bp.route('/colegios_json_paginado')
@login_required
def colegios_json_paginado():
    if current_user.rol != 'admin':
        return jsonify({"error": "No autorizado"}), 403

    # 1. Parámetros
    page = request.args.get('page', 1, type=int)
    search_query = request.args.get('q', '').strip()
    per_page = 10

    # 2. Query Base
    query = Colegio.query

    # 3. Filtro de búsqueda
    if search_query:
        sf = f"%{search_query}%"
        query = query.filter(or_(
            Colegio.nombre.ilike(sf),
            Colegio.nit.ilike(sf),
            Colegio.municipio.ilike(sf)
        ))

    # 4. Paginación
    pagination = query.order_by(Colegio.nombre.asc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    # 5. Formatear resultados
    resultado = []
    for col in pagination.items:
        resultado.append({
            "id": col.id,
            "nombre": col.nombre.upper(),
            "nit": col.nit,
            "municipio": col.municipio,
            "direccion": col.direccion,
            "telefono": col.telefono,
            "rector_nombre": col.rector_nombre or 'No asignado',
            "rector_documento": col.rector_documento or '',
            "rector_tipo_documento": col.rector_tipo_documento or '',
            "logo_path": col.logo_path or '',
            "firma_path": col.firma_path or '',
            # Traemos info del contador relacionado
            "contador_nombre": col.contador.username if col.contador else None
        })

    return jsonify({
        "colegios": resultado,
        "total_paginas": pagination.pages,
        "pagina_actual": pagination.page,
        "tiene_siguiente": pagination.has_next,
        "tiene_anterior": pagination.has_prev,
        "total_registros": pagination.total
    })