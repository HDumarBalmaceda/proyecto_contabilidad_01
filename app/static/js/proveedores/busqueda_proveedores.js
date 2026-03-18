let timerBusqueda;

document.addEventListener('DOMContentLoaded', function() {
    const inputBusqueda = document.getElementById('buscarProveedor');
    
    // 1. Prevenir que el formulario recargue la página al presionar Enter
    const formBusqueda = inputBusqueda ? inputBusqueda.closest('form') : null;
    if (formBusqueda) {
        formBusqueda.addEventListener('submit', (e) => e.preventDefault());
    }

    // 2. Evento de búsqueda con Debounce
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function() {
            clearTimeout(timerBusqueda);
            timerBusqueda = setTimeout(() => {
                cargarProveedores(1); 
            }, 400);
        });
    }

    // 3. Carga inicial
    cargarProveedores(1);
});

function cargarProveedores(pagina) {
    const input = document.getElementById('buscarProveedor');
    const query = input ? input.value.trim() : ''; // CAPTURA EL VALOR AQUÍ
    const contenedor = document.getElementById('tablaProveedoresBody');



    contenedor.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm text-primary"></div> Buscando...
    </td></tr>`;

    // IMPORTANTE: Asegúrate de que la URL incluya el parámetro 'q'
    fetch(`/proveedores/proveedores_json_paginado?page=${pagina}&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            renderizarTablaProveedores(data.proveedores);
            renderizarPaginacionProveedores(data);
        })
        .catch(err => {
            console.error("Error en fetch:", err);
            contenedor.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión</td></tr>`;
        });
}

function renderizarTablaProveedores(proveedores) {
    const tabla = document.getElementById('tablaProveedoresBody');
    if (!proveedores || proveedores.length === 0) {
        tabla.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No se encontraron resultados.</td></tr>`;
        return;
    }

    let html = '';
    proveedores.forEach(p => {
        const nombreAMostrar = p.tipo_tercero === 'Persona Jurídica' 
            ? p.razon_social 
            : `${p.primer_nombre || ''} ${p.primer_apellido || ''}`;

        html += `
        <tr>
            <td class="ps-4 fw-bold text-dark">${nombreAMostrar}</td>
            <td>${p.documento}${p.dv ? '-' + p.dv : ''}</td>
            <td>${p.movil || 'N/A'}</td>
            <td>${p.correo || 'N/A'}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-info text-white" 
                        data-bs-toggle="modal" 
                        data-bs-target="#verProveedorModal"
                        data-tipo_tercero="${p.tipo_tercero}"
                        data-documento="${p.documento}"
                        data-dv="${p.dv || ''}"
                        data-razon_social="${p.razon_social || ''}"
                        data-primer_nombre="${p.primer_nombre || ''}"
                        data-segundo_nombre="${p.segundo_nombre || ''}"
                        data-primer_apellido="${p.primer_apellido || ''}"
                        data-segundo_apellido="${p.segundo_apellido || ''}"
                        data-direccion="${p.direccion || ''}"
                        data-departamento="${p.departamento || ''}"
                        data-ciudad="${p.ciudad || ''}"
                        data-correo="${p.correo || ''}"
                        data-movil="${p.movil || ''}"
                        data-renta="${p.renta || ''}"
                        data-banco="${p.banco || ''}"
                        data-no_cuenta="${p.no_cuenta || ''}">
                    <i class="bi bi-eye-fill"></i>
                </button>
            </td>
        </tr>`;
    });
    tabla.innerHTML = html;
}

function renderizarPaginacionProveedores(data) {
    const nav = document.getElementById('paginacionProveedores');
    if (!nav) return;

    if (data.total_paginas <= 1) {
        nav.innerHTML = `<div class="text-muted small">Total: ${data.total_registros} registros</div>`;
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