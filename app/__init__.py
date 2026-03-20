from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager  
from config import Config
from flask_wtf.csrf import CSRFProtect

# Inicializamos las extensiones
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager() 
csrf = CSRFProtect()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    app.secret_key = '$HamethDumarB3*1025527566$'

    db.init_app(app)
    migrate.init_app(app, db)
    
    # 3. Configurar Flask-Login y CSRF
    login_manager.init_app(app)
    csrf.init_app(app)
    
    login_manager.login_view = 'auth.login'
    login_manager.login_message = "Por favor inicia sesión para acceder."

    with app.app_context():
        from app.modelos import models 
        
        @login_manager.user_loader
        def load_user(user_id):
            return models.Usuario.query.get(int(user_id))

        # --- REGISTRO DE BLUEPRINTS ---
        from app.controladores.colegios.form_colegios_controlador import colegios_bp
        app.register_blueprint(colegios_bp)

        from app.controladores.proveedores.proveedores_controlador import proveedores_bp
        app.register_blueprint(proveedores_bp)

        from app.controladores.perfil_colegios.procesos_controlador import procesos_bp
        app.register_blueprint(procesos_bp, url_prefix='/procesos')

        from app.controladores.perfil_colegios.historial_procesos import historial_bp
        app.register_blueprint(historial_bp, url_prefix='/historial')

        from app.controladores.perfil_colegios.reportes_controlador import reportes_bp
        app.register_blueprint(reportes_bp, url_prefix='/reportes')

        from app.controladores.autenticacion.auth_controlador import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/auth')

        from app.controladores.autenticacion.usuarios_controlador import usuarios_bp
        app.register_blueprint(usuarios_bp, url_prefix='/admin')

        from app.controladores.relaciones.enlaces import admin_bp 
        app.register_blueprint(admin_bp)

        from app.controladores.backups.backups_controlador import backups_bp
        app.register_blueprint(backups_bp, url_prefix='/backups')

    # --- RUTA RAÍZ ---
    @app.route("/")
    def index():
        from flask import redirect, url_for
        from flask_login import current_user
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        if current_user.rol == 'admin':
            return redirect(url_for('usuarios.panel_admin'))
        return redirect(url_for('colegios.mostrar_colegios'))

    # --- CONFIGURACIÓN DE CABECERAS NO-CACHE (DENTRO DE CREATE_APP) ---
    @app.after_request
    def add_header(response):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response

    return app # <--- El return siempre debe ser lo ÚLTIMO