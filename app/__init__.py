from flask import Flask, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager 
from config import Config
from flask_wtf.csrf import CSRFProtect
from datetime import timedelta

# Inicializamos las extensiones
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager() 
csrf = CSRFProtect()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Clave de seguridad (puedes moverla al config.py si prefieres)
    app.secret_key = '$HamethDumarB3*1025527566$'

    # --- CONFIGURACIÓN DE SESIÓN (Nivel de Aplicación) ---
    app.config.update(
        # Tiempo de vida de la sesión: 20 minutos
        PERMANENT_SESSION_LIFETIME=timedelta(minutes=20),
        # Crucial: Que la sesión se marque como permanente para que expire por tiempo
        SESSION_PERMANENT=True,
        # Refresca el tiempo con cada interacción del usuario
        SESSION_REFRESH_EACH_REQUEST=True,
        # Seguridad de la cookie
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax'
    )

    # Inicialización de extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    csrf.init_app(app)
    
    # Configuración de Flask-Login
    login_manager.login_view = 'auth.login'
    login_manager.login_message = "Su sesión ha expirado por inactividad. Por favor inicie sesión de nuevo."
    login_manager.login_message_category = "info"
    login_manager.session_protection = "strong"

    with app.app_context():
        from app.modelos import models 
        
        @login_manager.user_loader
        def load_user(user_id):
            return models.Usuario.query.get(int(user_id))

        # --- REGISTRO DE BLUEPRINTS ---
        from app.controladores.autenticacion.auth_controlador import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/auth')

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

        from app.controladores.autenticacion.usuarios_controlador import usuarios_bp
        app.register_blueprint(usuarios_bp, url_prefix='/admin')

        from app.controladores.relaciones.enlaces import admin_bp 
        app.register_blueprint(admin_bp)

        from app.controladores.backups.backups_controlador import backups_bp
        app.register_blueprint(backups_bp, url_prefix='/backups')

    # --- CONTROL DE CACHÉ PARA SEGURIDAD ---
    @app.after_request
    def add_header(response):
        # Evita que el navegador guarde copias de las páginas protegidas
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response

    return app