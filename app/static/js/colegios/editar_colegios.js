// 1. FUNCIÓN DE VISTA PREVIA (Compartida)
function mostrarVistaPrevia(input, previewId, textId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    const text = document.getElementById(textId);

    if (file && preview) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.classList.remove("d-none");
            if (text) text.classList.add("d-none");
        };
        reader.readAsDataURL(file);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const formColegio = document.getElementById("formCrearColegio");
    const modalTitle = document.getElementById('modalTitle');
    const logoInput = document.getElementById("logo_path");
    const firmaInput = document.getElementById("firma_path");

    // --- A. VISTAS PREVIAS ---
    if (logoInput) logoInput.addEventListener("change", function() { mostrarVistaPrevia(this, "previewLogo", "logoText"); });
    if (firmaInput) firmaInput.addEventListener("change", function() { mostrarVistaPrevia(this, "previewFirma", "firmaText"); });

    // --- B. LLENADO DEL MODAL (Delegación de eventos) ---
    document.addEventListener('click', function(e) {
        const btnEditar = e.target.closest('.btn-editar');
        const btnNuevo = e.target.closest('[data-bs-target="#crearColegioModal"]:not(.btn-editar)');

        if (btnEditar) {
            // 1. Configuración básica
            modalTitle.textContent = "Editar Información del Colegio";
            formColegio.setAttribute('data-mode', 'edit');
            formColegio.setAttribute('data-id', btnEditar.getAttribute('data-id'));

            // 2. Llenar campos de texto
            const campos = ['nombre', 'nit', 'direccion', 'telefono', 'municipio', 'rector_nombre', 'rector_documento', 'rector_tipo_documento'];
            campos.forEach(c => {
                const input = formColegio.querySelector(`[name="${c}"]`);
                if (input) input.value = btnEditar.getAttribute(`data-${c}`) || '';
            });

            // 3. MOSTRAR IMÁGENES ACTUALES (Esta es la parte que te faltaba)
            const logo = btnEditar.getAttribute('data-logo');
            const firma = btnEditar.getAttribute('data-firma');

            // Lógica para el Logo
            const previewLogo = document.getElementById("previewLogo");
            const logoText = document.getElementById("logoText");
            if (logo && logo !== 'None' && logo !== '') {
                previewLogo.src = `/static/uploads/${logo}`;
                previewLogo.classList.remove("d-none");
                if (logoText) logoText.classList.add("d-none");
            } else {
                previewLogo.classList.add("d-none");
                if (logoText) logoText.classList.remove("d-none");
            }

            // Lógica para la Firma
            const previewFirma = document.getElementById("previewFirma");
            const firmaText = document.getElementById("firmaText");
            if (firma && firma !== 'None' && firma !== '') {
                previewFirma.src = `/static/uploads/${firma}`;
                previewFirma.classList.remove("d-none");
                if (firmaText) firmaText.classList.add("d-none");
            } else {
                previewFirma.classList.add("d-none");
                if (firmaText) firmaText.classList.remove("d-none");
            }
            // ... (dentro del if (btnEditar), justo después de procesar la firma)
            
            // 4. FORZAR APERTURA DEL MODAL (por si los atributos data-bs fallan)
            const modalElement = document.getElementById('crearColegioModal');
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
            modalInstance.show();
        
        } 
        
        else if (btnNuevo) {
            // MODO CREACIÓN: Limpiar todo
            modalTitle.textContent = "Registrar Nuevo Colegio";
            formColegio.reset();
            formColegio.setAttribute('data-mode', 'create');
            formColegio.removeAttribute('data-id');
            
            // Ocultar imágenes y mostrar textos de ayuda
            document.querySelectorAll('.upload-box img').forEach(img => img.classList.add('d-none'));
            document.querySelectorAll('.upload-box span').forEach(span => span.classList.remove('d-none'));
        }
    });
    // --- C. ENVÍO DEL FORMULARIO (Fetch Único) ---
    if (formColegio) {
        formColegio.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const mode = this.getAttribute('data-mode');
            const id = this.getAttribute('data-id');
            
            // Decidir la URL dinámicamente
            const url = (mode === 'edit') ? `/colegios/editar/${id}` : `/colegios/crear`;

            const formData = new FormData(this);

            Swal.fire({ title: 'Procesando...', didOpen: () => { Swal.showLoading(); } });

            fetch(url, { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire('¡Éxito!', data.message, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Error', data.message || 'Error en la operación', 'error');
                }
            })
            .catch(error => {
                Swal.fire('Error', 'Fallo de conexión con el servidor', 'error');
            });
        });
    }
});