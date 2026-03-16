/**
 * FUNCIONES DE CARGA Y TABLA
 */
async function cargarProveedores(page = 1) {
    const query = document.getElementById('buscarProveedor')?.value.trim() || '';
    const contenedor = document.getElementById('tablaProveedoresBody');
    
    contenedor.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm text-primary"></div> Cargando...
    </td></tr>`;

    try {
        const response = await fetch(`/proveedores/proveedores_json_paginado?page=${page}&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        renderizarTablaLocal(data.proveedores);
        renderizarPaginacionLocal(data); // Usamos la función que está aquí abajo

    } catch (error) {
        console.error("Error:", error);
        contenedor.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión</td></tr>`;
    }
}

function renderizarTablaLocal(proveedores) {
    const tbody = document.getElementById('tablaProveedoresBody');
    const rol = document.getElementById('rol-metadata')?.dataset.rol || 'user';
    tbody.innerHTML = '';

    if (!proveedores || proveedores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay resultados</td></tr>`;
        return;
    }

    proveedores.forEach(p => {
        const nombre = p.tipo_tercero === 'Persona Jurídica' ? p.razon_social : `${p.primer_nombre} ${p.primer_apellido}`;
        const dataAttrs = Object.entries(p).map(([k, v]) => `data-${k}="${v || ''}"`).join(' ');

        let botones = `<button class="btn btn-sm btn-info text-white" data-bs-toggle="modal" data-bs-target="#verProveedorModal" ${dataAttrs}><i class="bi bi-eye-fill"></i></button>`;

        if (rol === 'admin') {
            botones += `
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#crearProveedorModal" ${dataAttrs}><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger btn-eliminar" data-url="/proveedores/eliminar/${p.id}" data-nombre="${nombre}"><i class="bi bi-trash3-fill"></i></button>
            `;
        }

        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td class="ps-4 fw-bold">${nombre}</td>
                <td>${p.documento}${p.dv ? '-' + p.dv : ''}</td>
                <td>${p.movil || '-'}</td>
                <td>${p.correo || p.correo_electronico || '-'}</td>
                <td class="text-center"><div class="btn-group gap-1">${botones}</div></td>
            </tr>`);
    });
}

// ESTA ES LA FUNCIÓN QUE NO QUERÍA SALIR, AHORA ESTÁ AQUÍ ATADA:
function renderizarPaginacionLocal(data) {
    const nav = document.getElementById('paginacionProveedores');
    if (!nav) return;

    if (data.total_paginas <= 1) {
        nav.innerHTML = `<div class="text-muted small text-center">Total: ${data.total_registros} registros</div>`;
        return;
    }

    nav.innerHTML = `
        <div class="d-flex justify-content-between align-items-center w-100">
            <small class="text-muted">Página ${data.pagina_actual} de ${data.total_paginas}</small>
            <ul class="pagination pagination-sm mb-0">
                <li class="page-item ${!data.tiene_anterior ? 'disabled' : ''}">
                    <button class="page-link" onclick="cargarProveedores(${data.pagina_actual - 1})">Anterior</button>
                </li>
                <li class="page-item active"><span class="page-link">${data.pagina_actual}</span></li>
                <li class="page-item ${!data.tiene_siguiente ? 'disabled' : ''}">
                    <button class="page-link" onclick="cargarProveedores(${data.pagina_actual + 1})">Siguiente</button>
                </li>
            </ul>
        </div>`;
}

/**
 * INICIALIZACIÓN
 */
document.addEventListener('DOMContentLoaded', function() {
    cargarProveedores(1);
    
    let timer;
    document.getElementById('buscarProveedor')?.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => cargarProveedores(1), 400);
    });

    // Lógica de Modales (Mantenemos la misma que ya tenías)
    const modalVer = document.getElementById('verProveedorModal');
    if (modalVer) {
        modalVer.addEventListener('show.bs.modal', function(e) {
            const btn = e.relatedTarget;
            const get = (a) => btn.getAttribute(a) || '---';
            document.getElementById('view_tipo_tercero').textContent = get('data-tipo_tercero');
            document.getElementById('view_documento_full').textContent = `${get('data-documento')} - ${get('data-dv')}`;
            document.getElementById('view_razon_social').textContent = get('data-razon_social');
            document.getElementById('view_p_nombre').textContent = get('data-primer_nombre');
            document.getElementById('view_s_nombre').textContent = get('data-segundo_nombre');
            document.getElementById('view_p_apellido').textContent = get('data-primer_apellido');
            document.getElementById('view_s_apellido').textContent = get('data-segundo_apellido');
            document.getElementById('view_direccion').textContent = get('data-direccion');
            document.getElementById('view_movil').textContent = get('data-movil');
            document.getElementById('view_correo').textContent = get('data-correo') || get('data-correo_electronico');
            document.getElementById('view_banco').textContent = get('data-banco');
            document.getElementById('view_cuenta').textContent = get('data-no_cuenta');
            document.getElementById('view_renta').textContent = get('data-renta');
            document.getElementById('view_ubicacion_full').textContent = `${get('data-ciudad')} / ${get('data-departamento')}`;
        });
    }

    const modalCrear = document.getElementById('crearProveedorModal');
    if (modalCrear) {
        modalCrear.addEventListener('show.bs.modal', function(e) {
            const btn = e.relatedTarget;
            const id = btn.getAttribute('data-id');
            const form = document.getElementById('formProveedor');
            if (id) {
                form.action = `/proveedores/editar/${id}`;
                const set = (idEl, attr) => {
                    const el = document.getElementById(idEl);
                    if(el) el.value = btn.getAttribute(attr) || '';
                };
                set('tipo_tercero', 'data-tipo_tercero');
                set('documento', 'data-documento');
                set('dv', 'data-dv');
                set('razon_social', 'data-razon_social');
                set('primer_nombre', 'data-primer_nombre');
                set('segundo_nombre', 'data-segundo_nombre');
                set('primer_apellido', 'data-primer_apellido');
                set('segundo_apellido', 'data-segundo_apellido');
                set('direccion', 'data-direccion');
                set('departamento', 'data-departamento');
                set('ciudad', 'data-ciudad');
                set('correo_electronico', 'data-correo_electronico');
                set('movil', 'data-movil');
                set('renta', 'data-renta');
                set('banco', 'data-banco');
                set('no_cuenta', 'data-no_cuenta');
                document.getElementById('tipo_tercero').dispatchEvent(new Event('change'));
            } else {
                form.reset();
                form.action = "/proveedores/"; // Ajusta a tu URL de crear
                document.getElementById('tipo_tercero').dispatchEvent(new Event('change'));
            }
        });
    }
});

// Eliminar
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-eliminar');
    if (btn) {
        Swal.fire({
            title: '¿Eliminar?',
            text: `Vas a borrar a ${btn.dataset.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, borrar'
        }).then(r => { if(r.isConfirmed) window.location.href = btn.dataset.url; });
    }
});