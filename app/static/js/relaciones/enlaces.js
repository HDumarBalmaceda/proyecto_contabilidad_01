/**
 * enlaces.js - Gestión de asignación con inyección de Token CSRF
 */

// Estado global del módulo
let paginaAsignados = 1;
let busquedaAsignados = "";

// 0. Función para cerrar alertas automáticamente (la mantuve igual)
setTimeout(function() {
    let alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        let bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
    });
}, 5000);

document.addEventListener("DOMContentLoaded", function() {
    // 1. Inicializar buscadores locales (Izquierda)
    initBuscadorLocal('buscarContadores', '.item-contador', '.nombre-contador');
    initBuscadorLocal('buscarLibres', '.item-colegio-libre', '.nombre-col');

    // --- NUEVA LÓGICA DE TOKEN PARA EL FORMULARIO ---
    const formVinculacion = document.querySelector('form[action*="panel_enlace"]');
    if (formVinculacion) {
        formVinculacion.addEventListener('submit', function() {
            // Buscamos el token del meta tag que ya tienes en el base.html
            const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            // Si no existe el input de CSRF dentro del form, lo creamos rápido
            let csrfInput = formVinculacion.querySelector('input[name="csrf_token"]');
            if (!csrfInput) {
                csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                formVinculacion.appendChild(csrfInput);
            }
            csrfInput.value = token;
        });
    }

    // 2. Inicializar buscador remoto (Derecha)
    const inputAsignados = document.getElementById('buscarAsignados');
    let timer;
    if (inputAsignados) {
        inputAsignados.addEventListener('input', function() {
            clearTimeout(timer);
            busquedaAsignados = this.value;
            timer = setTimeout(() => {
                paginaAsignados = 1; 
                cargarAsignados();
            }, 400);
        });
    }

    // 3. Carga inicial
    cargarAsignados();
});

/**
 * Filtra elementos existentes en el DOM
 */
function initBuscadorLocal(inputId, itemSelector, textSelector) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function() {
        const term = this.value.toLowerCase().trim();
        const items = document.querySelectorAll(itemSelector);

        items.forEach(item => {
            const texto = item.querySelector(textSelector).textContent.toLowerCase();
            item.style.display = texto.includes(term) ? '' : 'none';
        });
    });
}

/**
 * Obtiene los colegios asignados desde el servidor
 */
async function cargarAsignados() {
    const tbody = document.getElementById('tbodyAsignados');
    const loader = document.getElementById('loaderAsignados');

    if (loader) loader.classList.remove('d-none');

    try {
        const response = await fetch(`/admin/enlaces/asignados_json?page=${paginaAsignados}&q=${encodeURIComponent(busquedaAsignados)}`);
        const data = await response.json();

        renderizarTabla(data.colegios);
        renderizarPaginacion(data.total_paginas, data.pagina_actual);
    } catch (error) {
        console.error("Error:", error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error al conectar con el servidor</td></tr>';
    }
}

/**
 * Dibuja las filas en la tabla de asignados (mantiene el confirm original)
 */
function renderizarTabla(colegios) {
    const tbody = document.getElementById('tbodyAsignados');
    tbody.innerHTML = "";

    if (colegios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No hay coincidencias</td></tr>';
        return;
    }

    colegios.forEach(col => {
        const fila = `
            <tr>
                <td class="ps-3">
                    <strong>${col.nombre}</strong><br>
                    <small class="text-muted">${col.nit}</small>
                </td>
                <td>
                    <span class="badge rounded-pill bg-info text-dark">
                        <i class="bi bi-person-fill"></i> ${col.contador_nombre}
                    </span>
                </td>
                <td class="text-center">
                    <a href="/admin/enlaces/liberar_colegio/${col.id}"
                       class="btn btn-sm btn-outline-danger shadow-sm"
                       onclick="return confirm('¿Desvincular este colegio?')">
                        <i class="bi bi-unlock"></i>
                    </a>
                </td>
            </tr>
        `;
        tbody.innerHTML += fila;
    });
}

function renderizarPaginacion(total, actual) {
    const contenedor = document.getElementById('paginacionAsignados');
    contenedor.innerHTML = "";
    if (total <= 1) return;

    let html = `<nav><ul class="pagination pagination-sm mb-0">`;
    html += `<li class="page-item ${actual === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="cambiarPagina(event, ${actual - 1})">«</a></li>`;
    for (let i = 1; i <= total; i++) {
        html += `<li class="page-item ${i === actual ? 'active' : ''}"><a class="page-link" href="#" onclick="cambiarPagina(event, ${i})">${i}</a></li>`;
    }
    html += `<li class="page-item ${actual === total ? 'disabled' : ''}"><a class="page-link" href="#" onclick="cambiarPagina(event, ${actual + 1})">»</a></li>`;
    html += `</ul></nav>`;
    contenedor.innerHTML = html;
}

function cambiarPagina(event, nuevaPagina) {
    event.preventDefault();
    paginaAsignados = nuevaPagina;
    cargarAsignados();
}