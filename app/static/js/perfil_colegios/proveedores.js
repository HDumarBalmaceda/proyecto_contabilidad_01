/**
 * ARCHIVO: proveedores.js
 * MODIFICADO: Agregada seguridad CSRF para Vincular y Desvincular
 */

// Función auxiliar para obtener el token de seguridad de forma centralizada
const getCSRFToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

let timeoutBusqueda;

// --- 1. BUSCADOR ASÍNCRONO CON DEBUG ---
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'busquedaProveedor') {
        clearTimeout(timeoutBusqueda);
        const texto = e.target.value.trim();
        const select = document.getElementById('selectProveedor');

        if (texto.length < 2) return;

        timeoutBusqueda = setTimeout(async () => {
            try {
                const response = await fetch(`/proveedores/proveedores_json_paginado?q=${texto}`);
                const data = await response.json();

                select.innerHTML = ''; 

                if (data.proveedores.length === 0) {
                    const opt = document.createElement('option');
                    opt.disabled = true;
                    opt.textContent = 'No se encontraron resultados...';
                    select.appendChild(opt);
                } else {
                    data.proveedores.forEach((p, index) => {
                        const option = document.createElement('option');
                        option.value = p.id;

                        // --- DEBUG POR CADA PROVEEDOR ---
                        const pNombre = p.primer_nombre || '';
                        const pApellido = p.primer_apellido || '';
                        const nombrePersonal = `${pNombre} ${pApellido}`.trim();

                        let nombreMostrar = "";
                        if (nombrePersonal && nombrePersonal !== "") {
                            nombreMostrar = nombrePersonal;
                        } else if (p.razon_social && p.razon_social.trim() !== "") {
                            nombreMostrar = p.razon_social;
                        } else {
                            nombreMostrar = "Proveedor Sin Nombre Identificado";
                        }

                        option.textContent = `${nombreMostrar} | NIT: ${p.documento}`;
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error("❌ Error buscando proveedores:", error);
            }
        }, 300);
    }
});
// --- 2. VINCULAR PROVEEDOR (POST) ---
document.addEventListener('DOMContentLoaded', function() {
    const formVincular = document.getElementById('formVincular');

    if (formVincular) {
        formVincular.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const btnSubmit = this.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Vinculando...';

            fetch(this.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken() // <--- SEGURIDAD AGREGADA
                },
                body: new FormData(this)
            })
            .then(response => {
                if (!response.ok) throw new Error("Error de validación CSRF o Servidor");
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire({ icon: 'success', title: '¡Vinculado!', text: data.message })
                    .then(() => location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message });
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalText;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo procesar la solicitud (Falta Token CSRF)', 'error');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalText;
            });
        });
    }
});

// --- 3. DESVINCULAR PROVEEDOR (POST) ---
function confirmarDesvinculacion(colegioId, proveedorId, nombre) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a desvincular a "${nombre}".`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, desvincular'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/colegios/desvincular-proveedor/${colegioId}/${proveedorId}`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken() // <--- SEGURIDAD AGREGADA
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire('Eliminado', data.message, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            })
            .catch(error => {
                Swal.fire('Error', 'No se pudo desvincular. El servidor rechazó la petición.', 'error');
            });
        }
    });
}

// --- 4. VER DETALLES (GET) ---
// (Esta no necesita token porque es GET, pero la mantenemos igual)
function verDetalleProveedor(id) {
    fetch(`/proveedores/obtener/${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('view_tipo_tercero').innerText = data.tipo_tercero;
            document.getElementById('view_documento_full').innerText = data.documento_full;
            document.getElementById('view_razon_social').innerText = data.razon_social;
            document.getElementById('view_p_nombre').innerText = data.p_nombre;
            document.getElementById('view_s_nombre').innerText = data.s_nombre;
            document.getElementById('view_p_apellido').innerText = data.p_apellido;
            document.getElementById('view_s_apellido').innerText = data.s_apellido;
            document.getElementById('view_direccion').innerText = data.direccion;
            document.getElementById('view_ubicacion_full').innerText = data.ubicacion_full;
            document.getElementById('view_movil').innerText = data.movil;
            document.getElementById('view_correo').innerText = data.correo;
            document.getElementById('view_renta').innerText = data.renta;
            document.getElementById('view_banco').innerText = data.banco;
            document.getElementById('view_cuenta').innerText = data.cuenta;
            const myModal = new bootstrap.Modal(document.getElementById('verProveedorModal'));
            myModal.show();
        });
}

// Delegación de eventos para botones de desvinculación
document.addEventListener('click', function(e) {
    if (e.target.closest('.btn-desvincular')) {
        const btn = e.target.closest('.btn-desvincular');
        confirmarDesvinculacion(btn.dataset.colegioId, btn.dataset.proveedorId, btn.dataset.nombre);
    }
});