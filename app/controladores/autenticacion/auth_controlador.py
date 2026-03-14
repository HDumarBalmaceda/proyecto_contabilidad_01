from flask import Blueprint, render_template, redirect, url_for, flash, request, session 
from flask_login import login_user, logout_user, login_required, current_user
from app.modelos.models import Usuario 
from app import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        if current_user.rol == 'admin':
            return redirect(url_for('usuarios.panel_admin'))
        return redirect(url_for('colegios.mostrar_colegios'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        usuario = Usuario.query.filter_by(username=username).first()

        if usuario and usuario.check_password(password):
            login_user(usuario)
            
            # --- NUEVA LÓGICA PARA EL MODAL ---
            # Verificamos si la contraseña que acaba de usar es su mismo username
            if usuario.check_password(usuario.username):
                session['mostrar_modal_clave'] = True
            # ----------------------------------

            if usuario.rol == 'admin':
                return redirect(url_for('usuarios.panel_admin'))
            
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