/**
 * ARCHIVO: acciones_proveedores.js
 * UNIFICADO: Solo Mensajes Flash y Ver Detalles
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. MANEJO DE MENSAJES FLASH (SweetAlert2) ---
    // Busca si hay datos de mensajes enviados desde Flask
    const flashes = document.querySelectorAll('.flask-flash-data');
    
    flashes.forEach(flash => {
        const message = flash.dataset.message;
        const category = flash.dataset.category; // success, danger, warning, info

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
            // Botón que activó el modal
            const btn = event.relatedTarget;
            
            // Función auxiliar para obtener datos o poner guiones si están vacíos
            const get = (attr) => btn.getAttribute(attr) || '---';

            // Mapeo de datos a los elementos del modal de visualización
            
            // Sección Identificación
            document.getElementById('view_tipo_tercero').textContent = get('data-tipo_tercero');
            document.getElementById('view_documento_full').textContent = `${get('data-documento')} - ${get('data-dv')}`;
            document.getElementById('view_razon_social').textContent = get('data-razon_social');

            // Sección Nombres y Apellidos
            document.getElementById('view_p_nombre').textContent = get('data-primer_nombre');
            document.getElementById('view_s_nombre').textContent = get('data-segundo_nombre');
            document.getElementById('view_p_apellido').textContent = get('data-primer_apellido');
            document.getElementById('view_s_apellido').textContent = get('data-segundo_apellido');

            // Sección Ubicación y Contacto
            document.getElementById('view_ubicacion_full').textContent = `${get('data-ciudad')} / ${get('data-departamento')}`;
            document.getElementById('view_direccion').textContent = get('data-direccion');
            document.getElementById('view_movil').textContent = get('data-movil');
            document.getElementById('view_correo').textContent = get('data-correo');
            document.getElementById('view_renta').textContent = get('data-renta');

            // Sección Información Bancaria
            document.getElementById('view_banco').textContent = get('data-banco');
            document.getElementById('view_cuenta').textContent = get('data-no_cuenta');
        });
    }

});