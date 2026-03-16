/**
 * UNIFICADO: Lógica de confirmación para eliminar
 */
console.log("cargando js ");

document.addEventListener('click', function(e) {
    const boton = e.target.closest('.btn-eliminar');
    if (boton) {
        e.preventDefault();
        const url = boton.dataset.url;
        const nombre = boton.dataset.nombre;

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
    }
});

/**
 * UNIFICADO: Manejo de Modales (Editar y Ver)
 */
document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. MODAL CREAR/EDITAR ---
    const modalCrear = document.getElementById('crearProveedorModal');
    if (modalCrear) {
        const form = document.getElementById('formProveedor');
        const modalTitle = modalCrear.querySelector('.modal-title');
        const URL_CREAR_BASE = form.getAttribute('action');

        modalCrear.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const id = button.getAttribute('data-id');

            const setVal = (htmlId, attrName) => {
                const el = document.getElementById(htmlId);
                if (el) el.value = button.getAttribute(attrName) || '';
            };

            if (id) {
                modalTitle.textContent = 'Editar Información del Proveedor';
                form.action = `/proveedores/editar/${id}`;
                
                // Mapeo exacto con los IDs de tu HTML
                setVal('tipo_tercero', 'data-tipo_tercero');
                setVal('documento', 'data-documento');
                setVal('dv', 'data-dv');
                setVal('razon_social', 'data-razon_social');
                setVal('primer_nombre', 'data-primer_nombre');
                setVal('segundo_nombre', 'data-segundo_nombre');
                setVal('primer_apellido', 'data-primer_apellido');
                setVal('segundo_apellido', 'data-segundo_apellido');
                setVal('direccion', 'data-direccion');
                setVal('departamento', 'data-departamento');
                setVal('ciudad', 'data-ciudad');
                setVal('correo_electronico', 'data-correo'); // Atributo es data-correo
                setVal('movil', 'data-movil');
                setVal('renta', 'data-renta');
                setVal('banco', 'data-banco');
                setVal('no_cuenta', 'data-no_cuenta');

                // Disparar cambio para ocultar/mostrar campos según tipo
                document.getElementById('tipo_tercero').dispatchEvent(new Event('change'));
            } else {
                modalTitle.textContent = 'Registrar Nuevo Proveedor';
                form.action = URL_CREAR_BASE; 
                form.reset();
                document.getElementById('tipo_tercero').dispatchEvent(new Event('change'));
            }
        });
    }

    // --- 2. MODAL VER DETALLES ---
    const modalVer = document.getElementById('verProveedorModal');
    if (modalVer) {
        modalVer.addEventListener('show.bs.modal', function(event) {
            const btn = event.relatedTarget;
            const get = (attr) => btn.getAttribute(attr) || '---';

            // Identificación
            document.getElementById('view_tipo_tercero').textContent = get('data-tipo_tercero');
            document.getElementById('view_documento_full').textContent = `${get('data-documento')} - ${get('data-dv')}`;
            document.getElementById('view_razon_social').textContent = get('data-razon_social');

            // Nombres
            document.getElementById('view_p_nombre').textContent = get('data-primer_nombre');
            document.getElementById('view_s_nombre').textContent = get('data-segundo_nombre');
            document.getElementById('view_p_apellido').textContent = get('data-primer_apellido');
            document.getElementById('view_s_apellido').textContent = get('data-segundo_apellido');

            // Ubicación y contacto
            document.getElementById('view_direccion').textContent = get('data-direccion');
            document.getElementById('view_ubicacion_full').textContent = `${get('data-ciudad')} / ${get('data-departamento')}`;
            document.getElementById('view_movil').textContent = get('data-movil');
            document.getElementById('view_correo').textContent = get('data-correo');
            document.getElementById('view_renta').textContent = get('data-renta');

            // Banco
            document.getElementById('view_banco').textContent = get('data-banco');
            document.getElementById('view_cuenta').textContent = get('data-no_cuenta');
        });
    }
});