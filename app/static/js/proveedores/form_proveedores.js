/**
 * ARCHIVO: acciones_proveedores.js
 * UNIFICADO: Mensajes Flash, Ver Detalles y Crear Proveedor Seguro
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. MANEJO DE MENSAJES FLASH (SweetAlert2) ---
    const flashes = document.querySelectorAll('.flask-flash-data');
    flashes.forEach(flash => {
        const message = flash.dataset.message;
        const category = flash.dataset.category;

        Swal.fire({
            title: category === 'success' ? 'Registrado' : 'Atención',
            text: message,
            icon: category === 'danger' ? 'error' : category,
            confirmButtonColor: '#0d6efd',
            timer: 3000,
            timerProgressBar: true
        });
    });

    // --- 2. LÓGICA PARA VER FICHA COMPLETA (Modal Ver) ---
    const modalVer = document.getElementById('verProveedorModal');
    if (modalVer) {
        modalVer.addEventListener('show.bs.modal', function (event) {
            const btn = event.relatedTarget;
            const get = (attr) => btn.getAttribute(attr) || '---';

            document.getElementById('view_tipo_tercero').textContent = get('data-tipo_tercero');
            document.getElementById('view_documento_full').textContent = `${get('data-documento')} - ${get('data-dv')}`;
            document.getElementById('view_razon_social').textContent = get('data-razon_social');
            document.getElementById('view_p_nombre').textContent = get('data-primer_nombre');
            document.getElementById('view_s_nombre').textContent = get('data-segundo_nombre');
            document.getElementById('view_p_apellido').textContent = get('data-primer_apellido');
            document.getElementById('view_s_apellido').textContent = get('data-segundo_apellido');
            document.getElementById('view_ubicacion_full').textContent = `${get('data-ciudad')} / ${get('data-departamento')}`;
            document.getElementById('view_direccion').textContent = get('data-direccion');
            document.getElementById('view_movil').textContent = get('data-movil');
            document.getElementById('view_correo').textContent = get('data-correo');
            document.getElementById('view_renta').textContent = get('data-renta');
            document.getElementById('view_banco').textContent = get('data-banco');
            document.getElementById('view_cuenta').textContent = get('data-no_cuenta');
        });
    }

    // --- 3. LÓGICA PARA CREAR PROVEEDOR (Envío Seguro con Fetch) ---
    // Importante: Asegúrate de que tu <form> en el HTML tenga id="formCrearProveedor"
    const formCrearProveedor = document.getElementById('formCrearProveedor');

    if (formCrearProveedor) {
        formCrearProveedor.addEventListener('submit', function(e) {
            e.preventDefault(); // Detenemos la recarga de página

            Swal.fire({
                title: 'Guardando...',
                text: 'Registrando la información del proveedor',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            // Capturamos el token del meta-tag que pusimos en el layout
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            const formData = new FormData(this);

            fetch(this.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken // Enviamos el ticket de seguridad
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) throw new Error("Error en el servidor");
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: data.message,
                        confirmButtonColor: '#0d6efd'
                    }).then(() => {
                        location.reload(); // Recarga para ver el nuevo proveedor en la lista
                    });
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
            });
        });
    }

});