// funcion para alerta de creacion de usuarios 

document.addEventListener("DOMContentLoaded", function() {
    // 1. Manejo de apertura automática del modal en caso de error
    const modalElement = document.getElementById('crearUsuarioModal');
    
    if (modalElement) {
        // Buscamos si hay alertas de error o advertencia dentro del modal
        const tieneErrores = modalElement.querySelector('.alert-danger, .alert-warning');

        if (tieneErrores) {
            const myModal = new bootstrap.Modal(modalElement);
            myModal.show();
        }
    }

    // 2. Limpieza de alertas al cerrar el modal (opcional, para que no queden ahí si se reabre)
    modalElement.addEventListener('hidden.bs.modal', function () {
        const alertas = modalElement.querySelectorAll('.alert');
        alertas.forEach(alerta => alerta.remove());
    });
});