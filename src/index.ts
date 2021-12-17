// COMO ACTUAR ANTE DUPLICADOS
// EL CODIGOPROVINCIA/LOCALIDAD VIENE DEL CODIGO POSTAL? LO TENIAMOS MAL EN LA PLANTILLA?
import { BibliotecaModel, LocalidadModel, ProvinciumModel } from './../../IEIBack/src/models/biblioteca.models';
import { BibliotecaEUS } from './eusmodel';
const fs = require('fs');
import path from "path";
const { Biblioteca, Localidad, Provincia } = require('../../IEIBack/src/sqldb');

export async function extractDataEUS(rawData: BibliotecaEUS[]) {
  console.log('Extracting EUS_DATA')

  const provincias: ProvinciumModel[] = getProvincias(rawData);
  const localidades: LocalidadModel[] = getLocalidades(rawData);
  const bibliotecas: BibliotecaModel[] = getBibliotecas(rawData);

  console.log('Populating EUS_DATA');
  await populateDB(provincias, localidades, bibliotecas);
  return { numLocalidades: localidades.length, numProvincias: provincias.length }
}

function getProvincias(bibliotecas: BibliotecaEUS[]): ProvinciumModel[] {
  let provincias: ProvinciumModel[] = [];

  bibliotecas.forEach(biblioteca => {
    const codPostal = biblioteca.postalcode.replace('.', '')

    const provincia: ProvinciumModel = {
      nombreProvincia: biblioteca.territory,
      codigoProvincia: codPostal.slice(0, 2)
    }

    if (provincia.codigoProvincia && provincia.nombreProvincia) {
      provincias.push(provincia)
    }
  })

  const provinciasUnicas: ProvinciumModel[] = []

  provincias.forEach(provincia => {
    const repeated = provinciasUnicas.filter(provUnica => {
      return provUnica.codigoProvincia === provincia.codigoProvincia && provUnica.nombreProvincia === provincia.nombreProvincia
    })

    if (!repeated.length) {
      provinciasUnicas.push(provincia)
    }
  })

  return provinciasUnicas;
}

function getLocalidades(bibliotecas: BibliotecaEUS[]): LocalidadModel[] {
  let localidades: LocalidadModel[] = [];

  bibliotecas.forEach(biblioteca => {
    const codPostal = biblioteca.postalcode.replace('.', '')

    const localidad: LocalidadModel = {
      codigoLocalidad: codPostal.slice(2),
      nombreLocalidad: biblioteca.municipality.replace(/ /g, '').replace(/\//g, '-'),
      ProvinciumNombreProvincia: biblioteca.territory
    }

    if (localidad.codigoLocalidad && localidad.nombreLocalidad && localidad.ProvinciumNombreProvincia) {
      localidades.push(localidad)
    }
  })
  const localidadesUnicas: LocalidadModel[] = []

  localidades.forEach(localidad => {
    const repeated = localidadesUnicas.filter(localUnica => {
      return localUnica.ProvinciumNombreProvincia === localidad.ProvinciumNombreProvincia
        &&
        localUnica.codigoLocalidad === localidad.codigoLocalidad
        &&
        localUnica.nombreLocalidad === localidad.nombreLocalidad
    })

    if (!repeated.length) {
      localidadesUnicas.push(localidad)
    }
  })

  return localidadesUnicas;
}

function getBibliotecas(bibliotecas: BibliotecaEUS[]): BibliotecaModel[] {
  let bibliotecasRes: BibliotecaModel[] = [];

  bibliotecas.forEach(biblioteca => {
    const provincia: BibliotecaModel = {
      nombre: biblioteca.documentName,
      tipo: 'Pública',
      direccion: biblioteca.address,
      codigoPostal: biblioteca.postalcode.replace('.', ''),
      longitud: +biblioteca.lonwgs84,
      latitud: +biblioteca.latwgs84,
      telefono: biblioteca.phone.replace(/ /g, '').slice(0, 9),
      email: biblioteca.email,
      descripcion: biblioteca.documentDescription,
      LocalidadNombreLocalidad: biblioteca.municipality.replace(/ /g, '').replace(/\//g, '-'),
    }

    bibliotecasRes.push(provincia)
  })

  const bibliotecasUnicas: BibliotecaModel[] = []

  bibliotecasRes.forEach(biblioteca => {
    const repeated = bibliotecasUnicas.filter(bibliotecaUnica => {
      return bibliotecaUnica.nombre === biblioteca.nombre
    })

    if (!repeated.length) {
      bibliotecasUnicas.push(biblioteca)
    }
  })

  return bibliotecasUnicas;
}

async function populateDB(provincias: ProvinciumModel[], localidades: LocalidadModel[], bibliotecas: BibliotecaModel[]) {
  const prov = await Provincia.bulkCreate(
    provincias,
    {
      ignoreDuplicates: true
    }
  )
  console.log('SUCCESS POPULATING PROVINCIAS', prov.length);
  const pob = await Localidad.bulkCreate(
    localidades,
    {
      ignoreDuplicates: true
    }
  )
  console.log('SUCCESS POPULATING LOCALIDADES', pob.length);
  const bibl = await Biblioteca.bulkCreate(
    bibliotecas,
    {
      updateOnDuplicate: [
        'nombre',
        'tipo',
        'direccion',
        'codigoPostal',
        'longitud',
        'latitud',
        'telefono',
        'email',
        'descripcion',
      ]
    }
  )
  console.log('SUCCESS POPULATING BIBLIOTECAS', bibl.length);
}

function testExtractor() {
  const rawData = fs.readFileSync(path.join(__dirname, '../EUS.json')).toString();
  const parsedData = JSON.parse(rawData);
  extractDataEUS(parsedData);
}

// testExtractor();