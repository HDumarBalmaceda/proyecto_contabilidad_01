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

document.addEventListener('click', function (e) {
    const btnEliminar = e.target.closest('.btn-eliminar-usuario');

    if (btnEliminar) {
        const nombre = btnEliminar.getAttribute('data-nombre');
        const url = btnEliminar.getAttribute('data-url');

        Swal.fire({
            title: `¿Eliminar a ${nombre}?`,
            text: "Se borrarán sus proveedores y los colegios quedarán libres.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Creamos el form para enviar el POST a la ruta de Python
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = url;
                document.body.appendChild(form);
                form.submit();
            }
        });
    }
});