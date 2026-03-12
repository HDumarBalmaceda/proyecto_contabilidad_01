from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.modelos.models import Usuario 
from app import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # 1. Redirección si ya hay sesión activa
    if current_user.is_authenticated:
        if current_user.rol == 'admin':
            return redirect(url_for('usuarios.panel_admin'))
        return redirect(url_for('colegios.mostrar_colegios'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        usuario = Usuario.query.filter_by(username=username).first()

        # 2. Validación de credenciales
        if usuario and usuario.check_password(password):
            login_user(usuario)
            
            # 3. REDIRECCIÓN INTELIGENTE SEGÚN EL ROL
            # Si el usuario es admin, va al panel administrativo
            if usuario.rol == 'admin':
                return redirect(url_for('usuarios.panel_admin'))
            
            # Si es contador (o cualquier otro), va a los colegios
            return redirect(url_for('colegios.mostrar_colegios'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')
            return redirect(url_for('auth.login'))

    return render_template('autenticacion/inicio_sesion.html')

@auth_bp.route('/logout')
@login_required # Solo alguien logueado puede desloguearse
def logout():
    logout_user() # Borra la sesión del usuario
    flash('Has cerrado sesión exitosamente.', 'info')
    return redirect(url_for('auth.login'))