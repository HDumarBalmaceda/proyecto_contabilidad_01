from app import create_app

# Crear la aplicación usando la factoría
app = create_app()

# Configuraciones extra de desarrollo
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

if __name__ == '__main__':
    # host='0.0.0.0' le dice a Flask que escuche a cualquier dispositivo en la red
    app.run(debug=True, host='0.0.0.0', port=5000)