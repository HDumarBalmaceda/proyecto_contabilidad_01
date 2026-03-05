document.addEventListener("DOMContentLoaded", function() {
    
    const modalElement = document.getElementById('crearColegioModal');
    const form = document.getElementById('formCrearColegio');
    const modalTitle = document.getElementById('modalTitle');
    
    // Inicializamos el objeto Modal de Bootstrap manualmente
    const bsModal = new bootstrap.Modal(modalElement);

    // --- 1. LÓGICA PARA EDITAR (Botones de lápiz) ---
    // Usamos delegación de eventos por si agregas tarjetas dinámicamente
    document.addEventListener('click', function(event) {
        const button = event.target.closest('.btn-editar');
        if (button) {
            modalTitle.textContent = "Editar Información del Colegio";
            form.setAttribute('data-mode', 'edit');
            form.setAttribute('data-id', button.getAttribute('data-id'));

            // Llenamos los inputs
            form.querySelector('[name="nombre"]').value = button.getAttribute('data-nombre') || '';
            form.querySelector('[name="nit"]').value = button.getAttribute('data-nit') || '';
            form.querySelector('[name="direccion"]').value = button.getAttribute('data-direccion') || '';
            form.querySelector('[name="telefono"]').value = button.getAttribute('data-telefono') || '';
            form.querySelector('[name="municipio"]').value = button.getAttribute('data-municipio') || '';
            form.querySelector('[name="rector_nombre"]').value = button.getAttribute('data-rector_nombre') || '';
            form.querySelector('[name="rector_documento"]').value = button.getAttribute('data-rector_documento') || '';
            form.querySelector('[name="rector_tipo_documento"]').value = button.getAttribute('data-rector_tipo_documento') || 'CC';

            // Abrimos el modal manualmente (esto evita el error de backdrop)
            bsModal.show();
        }
    });

    // --- 2. LÓGICA PARA CREAR (Botón verde principal) ---
    // Este botón SÍ puede mantener el data-bs-toggle o lo manejamos aquí:
    const btnNuevo = document.querySelector('[data-bs-target="#crearColegioModal"]:not(.btn-editar)');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', function(e) {
            // Si el botón tiene data-bs-toggle, el modal abrirá solo. 
            // Solo reseteamos el formulario.
            modalTitle.textContent = "Registrar Nuevo Colegio";
            form.reset();
            form.setAttribute('data-mode', 'create');
            form.removeAttribute('data-id');
            
            // Limpiar vistas previas
            document.querySelectorAll('.upload-box img').forEach(img => img.classList.add('d-none'));
        });
    }

    // --- 3. LÓGICA PARA ELIMINAR ---
    document.addEventListener('click', function(event) {
        const boton = event.target.closest('.btn-eliminar');
        if (boton) {
            const id = boton.getAttribute('data-id');
            const nombre = boton.getAttribute('data-nombre');

            Swal.fire({
                title: '¿Estás seguro?',
                text: `Vas a eliminar el colegio "${nombre}". Esta acción no se puede deshacer y todos los procesos que tengas asociados a este colegio tambien se borraran .`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/colegios/eliminar/${id}`, { method: 'DELETE' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            Swal.fire('¡Eliminado!', data.message, 'success')
                            .then(() => { location.reload(); });
                        } else {
                            Swal.fire('Error', data.message, 'error');
                        }
                    });
                }
            });
        }
    });
});