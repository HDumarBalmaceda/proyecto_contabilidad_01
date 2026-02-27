// Función para mostrar la vista previa (se mantiene igual)
function mostrarVistaPrevia(input, previewId, textId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    const text = document.getElementById(textId);

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove("d-none");
            text.classList.add("d-none");
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = "#";
        preview.classList.add("d-none");
        text.classList.remove("d-none");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const logoInput = document.getElementById("logo_path");
    const firmaInput = document.getElementById("firma_path");
    const formColegio = document.getElementById("formCrearColegio"); 

    if (logoInput) {
        logoInput.addEventListener("change", function() {
            mostrarVistaPrevia(this, "previewLogo", "logoText");
        });
    }

    if (firmaInput) {
        firmaInput.addEventListener("change", function() {
            mostrarVistaPrevia(this, "previewFirma", "firmaText");
        });
    }

    // --- MANEJO DEL ENVÍO DINÁMICO (CREAR/EDITAR) ---
    if (formColegio) {
        formColegio.addEventListener("submit", function(e) {
            e.preventDefault();

            // 1. Determinar modo y URL
            const modo = this.getAttribute('data-mode'); // 'edit' o 'create'
            const id = this.getAttribute('data-id');
            
            // Si es edit, usamos la ruta de editar, si no, la que ya tiene el action del form
            const url = (modo === 'edit') ? `/colegios/editar/${id}` : this.action;

            const formData = new FormData(this);

            fetch(url, {
                method: 'POST', // Siempre POST para enviar archivos
                body: formData
            })
            .then(response => response.json()) // Cambiamos a .json() para leer mensajes del servidor
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire({
                        title: modo === 'edit' ? '¡Actualizado!' : '¡Registrado!',
                        text: data.message,
                        icon: 'success',
                        confirmButtonColor: '#0d6efd'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: data.message || 'Hubo un problema al procesar la solicitud.',
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
            });
        });
    }
});