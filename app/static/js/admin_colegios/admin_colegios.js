/**
 * 1. Lógica para la vista previa de imágenes (Solo para creación)
 */
function configurarVistaPrevia(inputId, previewId, textId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const text = document.getElementById(textId);

    if (input && preview && text) {
        input.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.classList.remove("d-none");
                    text.classList.add("d-none");
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

/**
 * 2. Inicialización y Eventos del Administrador
 */
document.addEventListener("DOMContentLoaded", function() {
    // Inicializar vistas previas
    configurarVistaPrevia("logo_path", "previewLogo", "logoText");
    configurarVistaPrevia("firma_path", "previewFirma", "firmaText");

    const form = document.getElementById("formCrearColegio");
    const modalTitle = document.getElementById('modalTitle');
    const btnGuardar = document.getElementById('btn-guardar-nuevo');
    const btnActualizar = document.getElementById('btn-actualizar-edit');

    // Re-abrir modal si hay errores de validación de Flask (Creación)
    if (document.getElementById('has-errors')) {
        const modalElement = document.getElementById('crearColegioModal');
        if (modalElement) {
            bootstrap.Modal.getOrCreateInstance(modalElement).show();
        }
    }

    // --- LÓGICA PARA LIMPIAR EL MODAL AL CREAR (Modo Nuevo) ---
    const btnNuevo = document.querySelector('[data-bs-target="#crearColegioModal"]:not(.btn-editar)');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', function() {
            if (form) {
                form.reset();
                form.action = "/colegios/crear"; 
                if (modalTitle) modalTitle.textContent = "Registrar Nuevo Colegio";
                
                // Intercambio de botones: Mostrar Guardar, Ocultar Actualizar
                if (btnGuardar) btnGuardar.classList.remove('d-none');
                if (btnActualizar) btnActualizar.classList.add('d-none');
                
                // Limpiar imágenes de vista previa
                document.querySelectorAll('.upload-box img').forEach(img => img.classList.add('d-none'));
                document.querySelectorAll('.upload-box span').forEach(span => span.classList.remove('d-none'));
            }
        });
    }

    // --- BÚSQUEDA EN TIEMPO REAL ---
    const inputBusqueda = document.getElementById('busquedaColegio');
    const tablaColegios = document.querySelector('table tbody');
    
    if (inputBusqueda && tablaColegios) {
        const filas = tablaColegios.getElementsByTagName('tr');
        inputBusqueda.addEventListener('keyup', function() {
            const texto = inputBusqueda.value.toLowerCase();
            Array.from(filas).forEach(fila => {
                const nombre = fila.cells[0]?.textContent.toLowerCase() || "";
                const nit = fila.cells[1]?.textContent.toLowerCase() || "";
                fila.style.display = (nombre.includes(texto) || nit.includes(texto)) ? "" : "none";
            });
            actualizarContadorVisible(filas);
        });
    }
});

/**
 * 3. Lógica para Eliminar (Exclusivo Admin)
 */
document.addEventListener('click', function(event) {
    const boton = event.target.closest('.btn-eliminar');
    if (boton) {
        const id = boton.getAttribute('data-id');
        const nombre = boton.getAttribute('data-nombre');

        Swal.fire({
            title: '¿Estás seguro?',
            text: `Vas a eliminar el colegio "${nombre}". Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`/colegios/eliminar/${id}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        Swal.fire('¡Eliminado!', data.message, 'success').then(() => location.reload());
                    } else {
                        Swal.fire('Error', data.message, 'error');
                    }
                });
            }
        });
    }
});

function actualizarContadorVisible(filas) {
    const visibles = Array.from(filas).filter(f => f.style.display !== "none").length;
    const footer = document.querySelector('.card-footer strong');
    if (footer) footer.textContent = visibles;
}