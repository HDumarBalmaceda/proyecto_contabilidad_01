from app import create_app
from flask_apscheduler import APScheduler
from app.controladores.backups.backups_controlador import realizar_el_backup_final, limpiar_backups_antiguos
from flask_wtf.csrf import CSRFProtect
from datetime import timedelta
import os

# 1. Instanciamos las extensiones
scheduler = APScheduler()
csrf = CSRFProtect()

# 2. Crear la aplicación usando la factoría
app = create_app()

# --- CONFIGURACIÓN DE SEGURIDAD Y SESIÓN ---
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', '$HamethDumarB3*1025527566$'),
    
    # 1. Activamos la persistencia para que el tiempo de vida (LIFETIME) funcione
    SESSION_PERMANENT=True, 
    
    # 2. Tiempo de inactividad: 20 minutos
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=20),
    
    # 3. Refresca la sesión en cada clic (el cronómetro vuelve a 20 min si hay actividad)
    SESSION_REFRESH_EACH_REQUEST=True,
    
    # 4. Seguridad de cookies
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    
    # 5. Desactivar el "recordarme" persistente
    REMEMBER_COOKIE_DURATION=timedelta(seconds=0)
)

# Inicializamos CSRF
csrf.init_app(app)

# Configuraciones extra de desarrollo
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# 3. Configuración y arranque del Scheduler
if not scheduler.running:
    scheduler.init_app(app)
    
    @scheduler.task('cron', id='backup_diario_automatico', hour=0, minute=0)
    def tarea_programada_backup():
        with app.app_context():
            try:
                print("Iniciando backup automático diario...")
                realizar_el_backup_final()
                limpiar_backups_antiguos()
                print("Backup y limpieza completados con éxito.")
            except Exception as e:
                print(f"Error en la tarea automática de backup: {e}")

    scheduler.start()

# 4. Ejecución del servidor
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)