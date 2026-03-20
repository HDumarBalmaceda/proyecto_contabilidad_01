document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('modalCambioClave');
    const form = document.getElementById('formCambioPassword');

    if (modalElement) {
        // 1. Mostrar modal si Flask lo requiere
        const debeMostrar = modalElement.getAttribute('data-show-modal') === 'true';
        if (debeMostrar) {
            const bsModal = new bootstrap.Modal(modalElement);
            bsModal.show();
        }

        if (form) {
            form.addEventListener('submit', function(e) {
                const pass = document.getElementById('n_pass').value;
                const confirm = document.getElementById('c_pass').value;

                // 2. Validaciones de SweetAlert
                if (pass !== confirm) {
                    e.preventDefault(); // Detener envío
                    Swal.fire({
                        icon: 'error',
                        title: '¡Error!',
                        text: 'Las contraseñas no coinciden.',
                        confirmButtonColor: '#1e3a5f'
                    });
                    return;
                }

                if (pass.length < 6) {
                    e.preventDefault(); // Detener envío
                    Swal.fire({
                        icon: 'warning',
                        title: 'Contraseña débil',
                        text: 'Debe tener al menos 6 caracteres.',
                        confirmButtonColor: '#1e3a5f'
                    });
                    return;
                }

                // 3. Si todo está OK, mostrar carga y DEJAR QUE EL FORM SE ENVÍE SOLO
                // No usamos e.preventDefault() aquí para evitar problemas con el CSRF
                Swal.fire({
                    title: 'Procesando...',
                    text: 'Actualizando contraseña...',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            });
        }

        // Limpieza al cerrar
        modalElement.addEventListener('hidden.bs.modal', function () {
            if (form) form.reset();
        });
    }
});