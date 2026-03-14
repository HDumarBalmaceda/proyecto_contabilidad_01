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

    # Capturamos el nuevo campo del formulario
    nombre_completo = request.form.get('nombre').strip() if request.form.get('nombre') else ""
    username = request.form.get('username').strip()
    rol = request.form.get('rol')
    email = request.form.get('email').strip()
    telefono = request.form.get('telefono').strip()

    # 1. Validación de campos vacíos (Agregamos nombre_completo a la lista)
    if not nombre_completo or not username or not rol or not email:
        flash('El nombre completo, el nombre de usuario, el rol y el correo son obligatorios.', 'warning')
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
            nombre_completo=nombre_completo, # Nuevo campo
            username=username, 
            rol=rol, 
            email=email, 
            telefono=telefono
        )
        nuevo_usuario.set_password(username) 
        db.session.add(nuevo_usuario)
        db.session.commit()
        
        # Alerta de éxito con el nombre real
        flash(f'Usuario {nombre_completo} creado exitosamente.', 'success')
        
    except Exception as e:
        db.session.rollback()
        # Imprimir el error real en la terminal te ayudará a debuguear si algo falla
        print(f"Error en creación de usuario: {str(e)}")
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
