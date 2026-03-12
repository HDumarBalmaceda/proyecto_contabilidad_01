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
@usuarios_bp.route('/usuarios/crear', methods=['GET', 'POST'])
@login_required
def crear_usuario():
    if current_user.rol != 'admin':
        flash('No tienes permisos para crear usuarios.', 'danger')
        return redirect(url_for('colegios.mostrar_colegios'))

    if request.method == 'POST':
        username = request.form.get('username')
        rol = request.form.get('rol')

        # 1. Validar si el usuario ya existe
        if Usuario.query.filter_by(username=username).first():
            flash('Este nombre de usuario ya existe.', 'warning')
            # Importante: Redirigimos al panel_admin donde está el modal
            return redirect(url_for('usuarios.panel_admin'))

        # 2. Crear el nuevo usuario
        nuevo_usuario = Usuario(username=username, rol=rol)
        
        # 3. ASIGNAR PASSWORD: Usamos el mismo username como contraseña inicial
        # Tu método set_password se encarga de encriptarlo automáticamente
        nuevo_usuario.set_password(username) 

        db.session.add(nuevo_usuario)
        db.session.commit()

        flash(f'¡Usuario {username} creado con éxito! La contraseña es su mismo nombre de usuario.', 'success')
        return redirect(url_for('usuarios.panel_admin'))

    # Si por algún motivo se accede vía GET, mandamos al panel
    return redirect(url_for('usuarios.panel_admin'))

@usuarios_bp.route('/gestion-usuarios')
@login_required
def lista_usuarios():
    # Seguridad: solo el admin entra aquí
    if current_user.rol != 'admin':
        return redirect(url_for('colegios.mostrar_colegios'))
    
    # Obtenemos todos los usuarios para mostrarlos en la nueva vista
    from app.modelos.models import Usuario
    todos_los_usuarios = Usuario.query.all()
    
    return render_template('administrador/usuarios.html', usuarios=todos_los_usuarios)