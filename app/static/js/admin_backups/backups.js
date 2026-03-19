/**
 * backups.js - Gestión dinámica de copias de seguridad
 */

let paginaActual = 1;
let filtroBusqueda = "";

document.addEventListener("DOMContentLoaded", function() {
    cargarBackups();

    // Buscador local para filtrar la lista cargada
    const inputBusqueda = document.getElementById('buscarBackup');
    inputBusqueda.addEventListener('input', function() {
        filtroBusqueda = this.value.toLowerCase();
        cargarBackups(); // Recarga filtrando
    });
});

async function cargarBackups() {
    const tbody = document.getElementById('tbodyBackups');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> Cargando...</td></tr>';

    try {
        // Asumiendo que creaste una ruta que devuelve JSON
        const response = await fetch(`/admin/backups_json?page=${paginaActual}&q=${filtroBusqueda}`);
        const data = await response.json();

        renderizarTabla(data.backups);
        renderizarPaginacion(data.total_paginas, data.pagina_actual);
    } catch (error) {
        console.error("Error:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error al cargar el historial</td></tr>';
    }
}

function renderizarTabla(backups) {
    const tbody = document.getElementById('tbodyBackups');
    tbody.innerHTML = "";

    if (backups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">No se encontraron respaldos</td></tr>';
        return;
    }

    backups.forEach(b => {
        const fila = `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-file-earmark-code-fill fs-4 text-info me-3"></i>
                        <div>
                            <span class="fw-bold d-block">${b.nombre}</span>
                            <span class="badge bg-light text-dark border small">SQL Dump</span>
                        </div>
                    </div>
                </td>
                <td><span class="text-muted small">${b.fecha}</span></td>
                <td><span class="badge rounded-pill bg-secondary">${b.tamano}</span></td>
                <td class="text-center">
                    <div class="btn-group shadow-sm">
                        <a href="/admin/descargar-backup/${b.nombre}" class="btn btn-sm btn-outline-primary" title="Descargar">
                            <i class="bi bi-download"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarBackup('${b.nombre}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += fila;
    });
}

function renderizarPaginacion(total, actual) {
    const contenedor = document.getElementById('paginacionBackups');
    contenedor.innerHTML = "";
    if (total <= 1) return;

    let html = `<nav><ul class="pagination pagination-sm mb-0">`;
    for (let i = 1; i <= total; i++) {
        html += `
            <li class="page-item ${i === actual ? 'active' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(event, ${i})">${i}</a>
            </li>`;
    }
    html += `</ul></nav>`;
    contenedor.innerHTML = html;
}

function cambiarPagina(event, n) {
    event.preventDefault();
    paginaActual = n;
    cargarBackups();
}

async function eliminarBackup(nombre) {
    if (!confirm(`¿Estás seguro de eliminar el respaldo ${nombre}? Esta acción no se puede deshacer.`)) return;
    
    // Aquí iría la lógica para borrar el archivo físico mediante un fetch al backend
    alert("Función de borrado pendiente de implementar en el controlador");
}