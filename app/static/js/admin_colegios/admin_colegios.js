/**
 * Lógica para la vista previa de imágenes en los cuadros de carga
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

// Inicializar cuando cargue el DOM
document.addEventListener("DOMContentLoaded", function() {
    configurarVistaPrevia("logo_path", "previewLogo", "logoText");
    configurarVistaPrevia("firma_path", "previewFirma", "firmaText");
}); 

// alertas del form craer colegios 
document.addEventListener("DOMContentLoaded", function() {
    if (document.getElementById('has-errors')) {
        const modalElement = document.getElementById('crearColegioModal');
        if (modalElement) {
            // Intentamos obtener la instancia existente o crear una nueva si no existe
            let modalCrear = bootstrap.Modal.getInstance(modalElement);
            if (!modalCrear) {
                modalCrear = new bootstrap.Modal(modalElement);
            }
            modalCrear.show();
        }
    }
});

    // --- 2. LÓGICA PARA CREAR (Botón verde principal) ---
    // Este botón SÍ puede mantener el data-bs-toggle o lo manejamos aquí:
    const btnNuevo = document.querySelector('[data-bs-target="#crearColegioModal"]:not(.btn-editar)');
    if (btnNuevo) {
    btnNuevo.addEventListener('click', function(e) {
        // Definir localmente para evitar el error "form is not defined"
        const form = document.getElementById("formCrearColegio");
        const modalTitle = document.getElementById('modalTitle');

        if (form && modalTitle) {
            modalTitle.textContent = "Registrar Nuevo Colegio";
            form.reset();
            form.setAttribute('data-mode', 'create');
            form.removeAttribute('data-id');
            
            // Limpiar vistas previas
            document.querySelectorAll('.upload-box img').forEach(img => img.classList.add('d-none'));
            document.querySelectorAll('.upload-box span').forEach(span => span.classList.remove('d-none'));
        }
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


    // funcion para el input de busqueda 

document.addEventListener("DOMContentLoaded", function() {
    const inputBusqueda = document.getElementById('busquedaColegio');
    const tablaColegios = document.querySelector('table tbody');
    const filas = tablaColegios.getElementsByTagName('tr');

    if (inputBusqueda) {
        inputBusqueda.addEventListener('keyup', function() {
            const texto = inputBusqueda.value.toLowerCase();

            Array.from(filas).forEach(fila => {
                // Obtenemos el texto del nombre (primera celda) y del NIT (segunda celda)
                const nombre = fila.cells[0].textContent.toLowerCase();
                const nit = fila.cells[1].textContent.toLowerCase();

                if (nombre.includes(texto) || nit.includes(texto)) {
                    fila.style.display = ""; // Muestra la fila
                } else {
                    fila.style.display = "none"; // Oculta la fila
                }
            });
            
            // Opcional: Mostrar mensaje si no hay resultados
            actualizarContadorVisible();
        });
    }

    function actualizarContadorVisible() {
        const visibles = Array.from(filas).filter(f => f.style.display !== "none").length;
        const footer = document.querySelector('.card-footer strong');
        if (footer) footer.textContent = visibles;
    }
});