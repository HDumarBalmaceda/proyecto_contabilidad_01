from app import create_app
from flask_apscheduler import APScheduler
# Importamos las funciones directamente de tu controlador
from app.controladores.backups.backups_controlador import realizar_el_backup_final, limpiar_backups_antiguos

# 1. Instanciamos el Scheduler
scheduler = APScheduler()

# Crear la aplicación usando la factoría
app = create_app()

# Configuraciones extra de desarrollo
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# 2. Configuración y arranque del Scheduler
if not scheduler.running:
    scheduler.init_app(app)
    
    # Tarea programada: Se ejecuta todos los días a las 00:00 (Medianoche)
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

# 3. Ejecución del servidor
if __name__ == '__main__':
    # host='0.0.0.0' permite acceso desde otros dispositivos en la misma red
    app.run(debug=True, host='0.0.0.0', port=5000)