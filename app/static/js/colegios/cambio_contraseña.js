document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('modalCambioClave');
    
    if (modalElement) {
        // 1. Abrir el modal si Flask envía la señal
        const debeMostrar = modalElement.getAttribute('data-show-modal') === 'true';
        if (debeMostrar) {
            const bsModal = new bootstrap.Modal(modalElement);
            bsModal.show();
        }

        // 2. Manejar el envío del formulario con validaciones de SweetAlert
        const form = document.getElementById('formCambioPassword');
        if (form) {
            form.addEventListener('submit', function(e) {
                const pass = document.getElementById('n_pass').value;
                const confirm = document.getElementById('c_pass').value;

                // Validación: Coincidencia
                if (pass !== confirm) {
                    e.preventDefault();
                    Swal.fire({
                        icon: 'error',
                        title: '¡Error!',
                        text: 'Las contraseñas no coinciden. Por favor, verifícalas.',
                        confirmButtonColor: '#1e3a5f'
                    });
                    return;
                }

                // Validación: Longitud mínima
                if (pass.length < 6) {
                    e.preventDefault();
                    Swal.fire({
                        icon: 'warning',
                        title: 'Contraseña débil',
                        text: 'La contraseña debe tener al menos 6 caracteres por seguridad.',
                        confirmButtonColor: '#1e3a5f'
                    });
                    return;
                }

                // Si todo está bien, puedes mostrar un "Cargando..." antes de que se recargue la página
                Swal.fire({
                    title: 'Procesando...',
                    text: 'Estamos actualizando tu seguridad.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            });
        }
    }
});