from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.modelos.models import Usuario  # Importante para la tabla de usuarios
from app import db

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

# --- RUTA PARA CREAR NUEVOS CONTADORES ---
@usuarios_bp.route('/usuarios/crear', methods=['POST'])
@login_required
def crear_usuario():
    if current_user.rol != 'admin':
        flash('Acceso denegado.', 'danger')
        return redirect(url_for('colegios.mostrar_colegios'))

    username = request.form.get('username').strip()
    rol = request.form.get('rol')
    email = request.form.get('email').strip()
    telefono = request.form.get('telefono').strip()

    # 1. Validación de campos vacíos
    if not username or not rol or not email:
        flash('El nombre de usuario, el rol y el correo son obligatorios.', 'warning')
        return redirect(url_for('usuarios.lista_usuarios'))

    # 2. Validar duplicados (Username)
    if Usuario.query.filter_by(username=username).first():
        flash(f'El nombre de usuario "{username}" ya está registrado.', 'danger')
        return redirect(url_for('usuarios.lista_usuarios'))

    # 3. Validar duplicados (Email)
    if Usuario.query.filter_by(email=email).first():
        flash(f'El correo "{email}" ya está asignado a otro usuario.', 'danger')
        return redirect(url_for('usuarios.lista_usuarios'))

    try:
        nuevo_usuario = Usuario(
            username=username, 
            rol=rol, 
            email=email, 
            telefono=telefono
        )
        nuevo_usuario.set_password(username) 
        db.session.add(nuevo_usuario)
        db.session.commit()
        flash(f'Usuario {username} creado exitosamente.', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Ocurrió un error inesperado al guardar en la base de datos.', 'danger')

    return redirect(url_for('usuarios.lista_usuarios'))


@usuarios_bp.route('/gestion-usuarios')
@login_required
def lista_usuarios():
    # Seguridad: solo el admin entra aquí
    if current_user.rol != 'admin':
        return redirect(url_for('colegios.mostrar_colegios'))
    
    # Obtenemos todos los usuarios para mostrarlos en la nueva vista
    from app.modelos.models import Usuario
    todos_los_usuarios = Usuario.query.all()
    
    return render_template('usuarios_admin/usuarios.html', usuarios=todos_los_usuarios)


