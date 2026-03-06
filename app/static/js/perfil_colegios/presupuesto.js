// static/js/presupuesto.js

var listaRubrosOficial = [
    { nombre: "MATERIALES Y SUMINISTROS INSTITUCIONALES", codigo: "2.1.2.02.01.003.0.1" },
    { nombre: "GASTOS PÓLIZA DE MANEJO", codigo: "2.1.2.02.02.007.03" },
    { nombre: "HONORARIOS PROFESIONALES", codigo: "2.1.2.02.02.008.01" },
    { nombre: "REMUNERACIONES POR SERVICIOS TECNICOS", codigo: "2.1.2.02.02.008.02" },
    { nombre: "IMPRESOS Y PUBLICACIONES", codigo: "2.1.2.02.02.008.05" },
    { nombre: "SERVICIO DE MANTENIMIENTO", codigo: "2.1.2.02.02.008.06" },
    { nombre: "MAQUINARIA DE OFICINA CONTABILIDAD E INFORMATICA", codigo: "2.3.2.01.01.003.02" },
    { nombre: "ACTIVIDADES PEDAGOGICAS, CIENTIFICAS, DEPORTIVAS Y CULTURALES", codigo: "2.3.2.02.02.009.02" }
];

function cargarOpcionesRubros() {
    const selectElement = document.getElementById('rubro_nombre');
    const inputCod = document.getElementById('cod_presupuestal');

    if (!selectElement) return;

    // Construimos todo el HTML de las opciones en una sola cadena de texto
    // Esto es más rápido y obliga al navegador a redibujar
    let contenido = '<option value="">-- Seleccione un rubro --</option>';
    
    listaRubrosOficial.forEach(item => {
        contenido += `<option value="${item.nombre}">${item.nombre}</option>`;
    });

    // Inyectamos todo de golpe
    selectElement.innerHTML = contenido;

    // IMPORTANTE: Si usas alguna librería tipo Select2, hay que avisarle:
    // $(selectElement).trigger('change'); 

    selectElement.onchange = function() {
        const seleccionado = listaRubrosOficial.find(r => r.nombre === this.value);
        if (inputCod) {
            inputCod.value = seleccionado ? seleccionado.codigo : "";
        }
    };


}

// Ejecutamos al cargar
document.addEventListener("DOMContentLoaded", cargarOpcionesRubros);
// Y un refuerzo por si el HTML tarda en renderizarse
setTimeout(cargarOpcionesRubros, 1000);