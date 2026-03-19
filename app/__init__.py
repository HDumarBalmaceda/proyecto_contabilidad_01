from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager  # <--- 1. Importar LoginManager
from config import Config


# Inicializamos las extensiones
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager() # <--- 2. Crear instancia fuera del create_app

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    app.secret_key = 'mi_llave_secreta_super_segura_123'

    db.init_app(app)
    migrate.init_app(app, db)
    
    # 3. Configurar Flask-Login
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login' # Define a dónde mandar al usuario si no ha iniciado sesión
    login_manager.login_message = "Por favor inicia sesión para acceder."

    with app.app_context():
        # Importar modelos
        from app.modelos import models 
        
        # 4. Cargador de usuario: Esto le dice a Flask cómo buscar a alguien por su ID
        @login_manager.user_loader
        def load_user(user_id):
            return models.Usuario.query.get(int(user_id))

        # --- TUS BLUEPRINTS EXISTENTES ---
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

        # 5. REGISTRO AUTH (Login/Logout)
        from app.controladores.autenticacion.auth_controlador import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/auth')

        # 6. GESTIÓN DE USUARIOS Y PANEL ADMIN
        from app.controladores.autenticacion.usuarios_controlador import usuarios_bp
        # Le ponemos un prefijo para que las URLs sean limpias: /admin/panel, /admin/usuarios/crear
        app.register_blueprint(usuarios_bp, url_prefix='/admin')

        # 7. RELACIONES Y ENLACES (NUEVO)
        from app.controladores.relaciones.enlaces import admin_bp 
        app.register_blueprint(admin_bp)

        # 8. BACKUPS 
        from app.controladores.backups.backups_controlador import backups_bp
        app.register_blueprint(backups_bp, url_prefix='/backups')

    # --- RUTA RAÍZ INTELIGENTE ---
    @app.route("/")
    def index():
        from flask import redirect, url_for
        from flask_login import current_user
        
        # Si no está logueado, al login
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        
        # Si es ADMIN, lo mandamos directo a su nuevo Panel
        if current_user.rol == 'admin':
            return redirect(url_for('usuarios.panel_admin'))
        
        # Si es CONTADOR, a la lista de colegios
        return redirect(url_for('colegios.mostrar_colegios'))

    return app