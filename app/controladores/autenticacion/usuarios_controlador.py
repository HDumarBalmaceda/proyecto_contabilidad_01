from flask import Blueprint, render_template, redirect, url_for, flash, request, session, jsonify
from flask_login import login_required, current_user
from app.modelos.models import Usuario  
from app import db
from sqlalchemy import or_
from flask_wtf.csrf import CSRFProtect

usuarios_bp = Blueprint('usuarios', __name__)

# --- RUTA DEL PANEL PRINCIPAL DEL ADMIN ---
@usuarios_bp.route('/admin/panel')
@login_required
def panel_admin():
    # Verificación de seguridad: Si no es admin, lo sacamos
    if current_user.rol != 'admin':
        flash('Acceso denegado: Se requieren permisos de administrador.', 'danger')
        return redirect(url_for('colegios.mostrar_colegios'))
    
    # Obtenemos todos los usuarios para mostrarlos en la tabla del panel
    todos_los_usuarios = Usuario.query.all()
    
    # Renderizamos el archivo que pusiste en la carpeta 'administrador'
    return render_template('administrador/administrador.html', usuarios=todos_los_usuarios)

# --- RUTA PARA CREAR NUEVOS USUARIOS ---
@usuarios_bp.route('/usuarios/crear', methods=['POST'])
@login_required
def crear_usuario():
    # 1. Seguridad: Solo el admin entra
    if current_user.rol != 'admin':
        flash('Acceso denegado: Se requieren permisos de administrador.', 'danger')
        return redirect(url_for('colegios.mostrar_colegios'))

    # 2. Captura y limpieza de datos
    nombre_completo = request.form.get('nombre', '').strip()
    username = request.form.get('username', '').strip()
    rol = request.form.get('rol')
    email = request.form.get('email', '').strip()
    telefono = request.form.get('telefono', '').strip()

    # 3. Validación de campos obligatorios
    if not nombre_completo or not username or not rol or not email:
        flash('El nombre completo, usuario, rol y correo son obligatorios.', 'warning')
        return redirect(url_for('usuarios.lista_usuarios'))

    # 4. Validar duplicados (Username o Email) de una sola vez
    usuario_existente = Usuario.query.filter(
        (Usuario.username == username) | (Usuario.email == email)
    ).first()
    
    if usuario_existente:
        if usuario_existente.username == username:
            flash(f'El nombre de usuario "{username}" ya existe.', 'danger')
        else:
            flash(f'El correo "{email}" ya está registrado.', 'danger')
        return redirect(url_for('usuarios.lista_usuarios'))

    # 5. Intentar guardar en la Base de Datos
    try:
        nuevo_usuario = Usuario(
            nombre_completo=nombre_completo,
            username=username, 
            rol=rol, 
            email=email, 
            telefono=telefono
        )
        
        # IMPORTANTE: Asignamos el username como contraseña inicial
        # Ya que ocultamos el input de password en el modal al crear
        nuevo_usuario.set_password(username) 
        
        db.session.add(nuevo_usuario)
        db.session.commit()
        
        # Mensaje informativo para el administrador
        flash(f'¡Éxito! Usuario "{nombre_completo}" creado. Contraseña provisional: {username}', 'success')
        
    except Exception as e:
        db.session.rollback()
        print(f"Error crítico en DB: {str(e)}") # Para tu consola de VS Code
        flash('Error al procesar la solicitud en el servidor.', 'danger')

    return redirect(url_for('usuarios.lista_usuarios'))


# 1. La ruta que carga la página (El cascarón)
@usuarios_bp.route('/gestion-usuarios')
@login_required
def lista_usuarios():
    if current_user.rol != 'admin':
        return redirect(url_for('colegios.mostrar_colegios'))
    # Ya no enviamos "todos_los_usuarios", el JS se encargará de pedirlos
    return render_template('usuarios_admin/usuarios.html')


@usuarios_bp.route('/usuarios_json')
@login_required
def usuarios_json():
    # 1. SEGURIDAD
    if current_user.rol != 'admin':
        return jsonify({"error": "No autorizado"}), 403

    try:
        # 2. PARÁMETROS
        page = request.args.get('page', 1, type=int)
        search_query = request.args.get('q', '').strip()
        per_page = 10 

        # 3. CONSULTA BASE
        query = Usuario.query

        # 4. FILTRO DE BÚSQUEDA
        if search_query:
            search_filter = f"%{search_query}%"
            # Ajusta estos nombres (username, email, nombre_completo) a tus columnas reales en la DB
            query = query.filter(
                or_(
                    Usuario.username.ilike(search_filter),
                    Usuario.email.ilike(search_filter),
                    Usuario.rol.ilike(search_filter),
                    Usuario.nombre_completo.ilike(search_filter),
                    Usuario.telefono.ilike(search_filter)
                )
            )

        # 5. PAGINACIÓN
        pagination = query.order_by(Usuario.id.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        # 6. CONSTRUCCIÓN DE LA RESPUESTA JSON
        usuarios_data = []
        for u in pagination.items:
            usuarios_data.append({
                'id': u.id,
                'username': u.username,
                # Usamos getattr por seguridad por si la columna no existe en el modelo
                'nombre_completo': getattr(u, 'nombre_completo', None),
                'email': u.email,
                'rol': u.rol,
                'telefono': getattr(u, 'telefono', None),
                'fecha_registro': u.fecha_registro.strftime('%d/%m/%Y') if hasattr(u, 'fecha_registro') and u.fecha_registro else "N/A"
            })

        return jsonify({
            'usuarios': usuarios_data,
            'total_paginas': pagination.pages,
            'pagina_actual': pagination.page,
            'total_registros': pagination.total,
            'tiene_siguiente': pagination.has_next,
            'tiene_anterior': pagination.has_prev
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc()) # Esto imprimirá el error real en tu consola de Flask
        return jsonify({"error": str(e)}), 500


@usuarios_bp.route('/usuarios/eliminar/<int:id>', methods=['POST'])
@login_required
def eliminar_usuario(id):
    if current_user.rol != 'admin':
        flash('No tienes permisos.', 'danger')
        return redirect(url_for('usuarios.lista_usuarios'))

    usuario = Usuario.query.get_or_404(id)
    
    try:
        # Liberar colegios
        for col in usuario.colegios:
            col.usuario_id = None
        
        db.session.delete(usuario)
        db.session.commit()
        flash(f'El usuario {usuario.username} ha sido eliminado correctamente.', 'success')
    except Exception as e:
        db.session.rollback()
        flash('No se pudo eliminar el usuario.', 'danger')

    return redirect(url_for('usuarios.lista_usuarios'))

# --- RUTA PARA EDITAR USUARIOS EXISTENTES ---
@usuarios_bp.route('/usuarios/editar', methods=['POST'])
@login_required
def editar_usuario():
    print(request.form)
    # 1. Seguridad: Solo el admin edita
    if current_user.rol != 'admin':
        flash('No tienes permiso para realizar esta acción.', 'danger')
        return redirect(url_for('usuarios.lista_usuarios'))

    # 2. Obtener el usuario o lanzar 404 si el ID no es válido
    user_id = request.form.get('usuario_id')
    if not user_id:
        flash('Error: No se proporcionó un ID de usuario válido.', 'danger')
        return redirect(url_for('usuarios.lista_usuarios'))
        
    usuario = Usuario.query.get_or_404(user_id)

    # 3. Capturar nuevos datos
    nuevo_username = request.form.get('username', '').strip()
    nuevo_email = request.form.get('email', '').strip()
    nuevo_nombre = request.form.get('nombre', '').strip()
    nuevo_telefono = request.form.get('telefono', '').strip()
    nuevo_rol = request.form.get('rol')

    # 4. Validar que el nuevo Username o Email no los tenga OTRO usuario
    # Excluimos al usuario actual de la búsqueda usando .id != usuario.id
    usuario_duplicado = Usuario.query.filter(
        (Usuario.id != usuario.id) & 
        ((Usuario.username == nuevo_username) | (Usuario.email == nuevo_email))
    ).first()

    if usuario_duplicado:
        flash('Error: El nombre de usuario o el correo ya están en uso por otra persona.', 'danger')
        return redirect(url_for('usuarios.lista_usuarios'))

    # 5. Aplicar cambios
    usuario.username = nuevo_username
    usuario.nombre_completo = nuevo_nombre
    usuario.email = nuevo_email
    usuario.telefono = nuevo_telefono
    usuario.rol = nuevo_rol

    # Lógica de contraseña: Solo si se escribió algo en el campo
    nueva_clave = request.form.get('password')
    if nueva_clave and nueva_clave.strip():
        usuario.set_password(nueva_clave.strip())

    try:
        db.session.commit()
        flash(f'Usuario "{usuario.nombre_completo}" actualizado con éxito.', 'success')
    except Exception as e:
        db.session.rollback()
        print(f"Error en edición: {str(e)}")
        flash('Ocurrió un error inesperado al actualizar los datos.', 'danger')

    return redirect(url_for('usuarios.lista_usuarios'))


@usuarios_bp.route('/cambiar-password-obligatorio', methods=['POST'])
@login_required
def cambio_obligatorio():
    nueva_clave = request.form.get('password')
    confirmar = request.form.get('confirm_password')

    # DEBUG: Para ver en consola qué llega
    print(f"DEBUG: Nueva clave: {nueva_clave}")
    print(f"DEBUG: Confirmar: {confirmar}")

    if not nueva_clave or nueva_clave.strip() == "":
        flash('La contraseña no puede estar vacía.', 'warning')
        return redirect(url_for('colegios.mostrar_colegios'))

    if nueva_clave != confirmar:
        flash('Las contraseñas no coinciden.', 'error')
        return redirect(url_for('colegios.mostrar_colegios'))

    try:
        # 1. Actualizamos la clave usando el método del modelo
        current_user.set_password(nueva_clave.strip())
        
        # 2. Forzamos que SQLAlchemy marque al usuario como "modificado"
        db.session.add(current_user) 
        
        # 3. Guardamos en la base de datos
        db.session.commit()
        
        # 4. IMPORTANTE: Limpiamos la sesión para que el modal no vuelva a salir
        session.pop('mostrar_modal_clave', None)
        
        print("DEBUG: ¡Contraseña actualizada en DB con éxito!")
        flash('¡Contraseña actualizada con éxito!', 'success')
        
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG ERROR: {str(e)}")
        flash('Error al actualizar la base de datos.', 'error')

    return redirect(url_for('colegios.mostrar_colegios'))