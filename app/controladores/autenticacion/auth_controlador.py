from flask import Blueprint, render_template, redirect, url_for, flash, request, session 
from flask_login import login_user, logout_user, login_required, current_user
from app.modelos.models import Usuario 
from app import db
from flask_wtf.csrf import CSRFProtect
from app import db, csrf

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # Si ya está logueado, lo mandamos a su panel correspondiente
    if current_user.is_authenticated:
        if current_user.rol == 'admin':
            return redirect(url_for('usuarios.panel_admin'))
        return redirect(url_for('colegios.mostrar_colegios'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        usuario = Usuario.query.filter_by(username=username).first()

        if usuario and usuario.check_password(password):
            # 1. Iniciamos sesión. 'remember=False' para que no cree cookie de larga duración.
            login_user(usuario, remember=False)
            
            # 2. ACTIVAR EL CRONÓMETRO DE INACTIVIDAD
            # Al ponerlo en True, Flask usa el PERMANENT_SESSION_LIFETIME de 20 min del main.py
            session.permanent = True 
            
            # 3. Lógica para forzar cambio de clave si es igual al username
            if usuario.check_password(usuario.username):
                session['mostrar_modal_clave'] = True

            # 4. Redirección según el rol
            if usuario.rol == 'admin':
                return redirect(url_for('usuarios.panel_admin'))
            
            return redirect(url_for('colegios.mostrar_colegios'))
        
        else:
            flash('Usuario o contraseña incorrectos', 'danger')
            return redirect(url_for('auth.login'))

    return render_template('autenticacion/inicio_sesion.html')
    
# --- CAMBIO 2: Permitir GET y quitar login_required para el Beacon ---
@auth_bp.route('/logout', methods=['GET', 'POST'])
@csrf.exempt # Mantenemos esto para que el JS (si decides dejarlo) no rebote
def logout():
    # 1. Limpiamos todas las variables de la sesión (como el modal de clave)
    session.clear() 
    
    # 2. Avisamos a Flask-Login que destruya la identidad del usuario
    logout_user() 
    
    # 3. Preparamos la redirección al login
    response = redirect(url_for('auth.login'))
    
    # 4. MATAMOS EL CACHÉ (Crucial para que no puedan dar "Atrás" y ver datos)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0' # Fecha en el pasado
    
    # 5. Borramos la cookie de sesión del navegador explícitamente
    # Esto es el "tiro de gracia" para la seguridad
    response.set_cookie('session', '', expires=0)
    
    flash('Sesión cerrada correctamente.', 'info')
    return response