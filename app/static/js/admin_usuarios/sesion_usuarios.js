function inicializarSeguridadSesion(logoutUrl) {
    console.log("Cronómetro de inactividad iniciado (20 minutos)");

    // Definimos los tiempos en milisegundos
    const tiempoTotal = 20 * 60 * 1000; // 20 minutos
    const tiempoAviso = 18 * 60 * 1000; // Aviso a los 18 minutos

    // 1. Temporizador para el cierre automático y redirección inmediata
    setTimeout(function() {
        Swal.fire({
            title: 'Sesión Expirada',
            text: 'Redireccionando al login...',
            icon: 'warning',
            timer: 3000, // <--- Se cierra solo en 3 segundos
            timerProgressBar: true, // Muestra la barrita de tiempo
            showConfirmButton: false, // Quitamos el botón para que sea automático
            allowOutsideClick: false,
            willClose: () => {
                // Justo antes de cerrarse la alerta, hacemos la redirección
                window.location.href = logoutUrl;
            }
        });

        // Por seguridad, si Swal falla, forzamos la salida a los 3.5 segundos
        setTimeout(() => {
            window.location.href = logoutUrl;
        }, 3500);

    }, tiempoTotal);

    // 2. Temporizador para el aviso previo (Toast)
    setTimeout(function() {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
        });
        
        Toast.fire({
            icon: 'info',
            title: 'Tu sesión expirará en 2 minutos por inactividad'
        });
    }, tiempoAviso);

    // 3. Control de caché (Botón Atrás)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
            window.location.reload();
        }
    });
}