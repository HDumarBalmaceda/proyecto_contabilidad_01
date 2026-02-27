document.addEventListener('DOMContentLoaded', function() {
    // Buscamos si hay mensajes de Flask ocultos en el DOM
    const flashes = document.querySelectorAll('.flask-flash-data');
    
    flashes.forEach(flash => {
        const message = flash.dataset.message;
        const category = flash.dataset.category; // success, danger, warning, info

        Swal.fire({
            title: category === 'success' ? 'Registrado' : 'Atención',
            text: message,
            icon: category === 'danger' ? 'error' : category, // Adaptar 'danger' de Bootstrap a 'error' de SwAl2
            confirmButtonColor: '#0d6efd',
            timer: 3000,
            timerProgressBar: true
        });
    });
});




document.addEventListener('DOMContentLoaded', function() {
    
    // --- Lógica para confirmar eliminación ---
    const botonesEliminar = document.querySelectorAll('.btn-eliminar');

    botonesEliminar.forEach(boton => {
        boton.addEventListener('click', function(e) {
            e.preventDefault(); // Evita que el enlace se abra de inmediato
            
            const url = this.dataset.url;
            const nombre = this.dataset.nombre;

            Swal.fire({
                title: '¿Estás seguro?',
                text: `Vas a eliminar a: ${nombre}. Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    // Si el usuario confirma, redirigimos a la URL de eliminación
                    window.location.href = url;
                }
            });
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    
    // 1. --- MANEJO DE MENSAJES FLASH (SWAL) ---
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

    // 2. --- LÓGICA DEL MODAL (CREAR/EDITAR) ---
    const modalElement = document.getElementById('crearProveedorModal');
    const form = document.getElementById('formProveedor');
    
    if (modalElement && form) {
        const modalTitle = modalElement.querySelector('.modal-title');
        
        // IMPORTANTE: Capturamos la URL que Flask ya renderizó en el HTML
        // Esta será nuestra ruta base para "Crear"
        const URL_CREAR_BASE = form.getAttribute('action');

        modalElement.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const id = button.getAttribute('data-id');

            const safeSet = (id, attr) => {
                const el = document.getElementById(id);
                if (el) el.value = button.getAttribute(attr) || '';
            };

            if (id) {
                // --- MODO EDICIÓN ---
                modalTitle.textContent = 'Editar Proveedor';
                form.action = `/proveedores/editar/${id}`;
                
                safeSet('tipo_tercero', 'data-tipo_tercero');
                safeSet('documento', 'data-documento');
                safeSet('dv', 'data-dv');
                safeSet('razon_social', 'data-razon_social');
                safeSet('primer_nombre', 'data-primer_nombre');
                safeSet('segundo_nombre', 'data-segundo_nombre');
                safeSet('primer_apellido', 'data-primer_apellido');
                safeSet('segundo_apellido', 'data-segundo_apellido');
                safeSet('direccion', 'data-direccion');
                safeSet('departamento', 'data-departamento');
                safeSet('ciudad', 'data-ciudad');
                safeSet('correo_electronico', 'data-correo');
                safeSet('movil', 'data-movil');
                safeSet('renta', 'data-renta');
                safeSet('banco', 'data-banco');
                safeSet('no_cuenta', 'data-no_cuenta');

                const tipoTercero = document.getElementById('tipo_tercero');
                if (tipoTercero) tipoTercero.dispatchEvent(new Event('change'));

            } else {
                // --- MODO CREACIÓN ---
                modalTitle.textContent = 'Registrar Nuevo Proveedor';
                // Restauramos la URL original que capturamos al inicio
                form.action = URL_CREAR_BASE; 
                form.reset();
            }
        });
    }

    // 3. --- CONFIRMACIÓN DE ELIMINACIÓN ---
    const botonesEliminar = document.querySelectorAll('.btn-eliminar');
    botonesEliminar.forEach(boton => {
        boton.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.dataset.url;
            const nombre = this.dataset.nombre;

            Swal.fire({
                title: '¿Estás seguro?',
                text: `Vas a eliminar a: ${nombre}. Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = url;
                }
            });
        });
    });
});



// --- Lógica para Ver Ficha Completa ---
    const modalVer = document.getElementById('verProveedorModal');
    if (modalVer) {
       modalVer.addEventListener('show.bs.modal', function (event) {
    const btn = event.relatedTarget;
    const get = (attr) => btn.getAttribute(attr) || '---';

    // Identificación
    document.getElementById('view_tipo_tercero').textContent = get('data-tipo_tercero');
    document.getElementById('view_documento_full').textContent = `${get('data-documento')} - ${get('data-dv')}`;
    document.getElementById('view_razon_social').textContent = get('data-razon_social');

    // Nombres y Apellidos
    document.getElementById('view_p_nombre').textContent = get('data-primer_nombre');
    document.getElementById('view_s_nombre').textContent = get('data-segundo_nombre');
    document.getElementById('view_p_apellido').textContent = get('data-primer_apellido');
    document.getElementById('view_s_apellido').textContent = get('data-segundo_apellido');

    // Ubicación (OJO AQUÍ: Asegúrate que el ID coincida con el HTML nuevo)
    const ciudad = get('data-ciudad');
    const depto = get('data-departamento');
    document.getElementById('view_ubicacion_full').textContent = `${ciudad} / ${depto}`;

    // Contacto y Otros
    document.getElementById('view_direccion').textContent = get('data-direccion');
    document.getElementById('view_movil').textContent = get('data-movil');
    document.getElementById('view_correo').textContent = get('data-correo');
    document.getElementById('view_renta').textContent = get('data-renta');

    // Banco
    document.getElementById('view_banco').textContent = get('data-banco');
    document.getElementById('view_cuenta').textContent = get('data-no_cuenta');
});
    }