// PRELOADER
//
// Waarom? Bestanden laden (modellen, texturen, geluid) en shaders compileren kost tijd.
// Zonder preloader ziet de speler een leeg of half scherm, of een auto die plots "verschijnt".
//
// THREE.LoadingManager houdt bij hoeveel bestanden er geladen worden.
// Geef hem mee aan elke loader (GLTFLoader, TextureLoader, AudioLoader, ...),
// dan krijg je één centrale plek voor de voortgang.

import * as THREE from 'three/webgpu'

export function createPreloader() {
  const element = document.getElementById('loader')
  const bar = element.querySelector('.bar-fill')
  const status = element.querySelector('.status')

  // De voortgang van bestanden laden vult de balk tot 80%; de laatste 20% is voor shaders
  const FILES_SHARE = 0.8

  const manager = new THREE.LoadingManager()

  // Wordt opgeroepen telkens als een bestand KLAAR is.
  // Let op: itemsTotal kan nog stijgen! Een GLB verwijst bv. naar een textuur
  // die pas gevonden wordt als de GLB uitgepakt is.
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    setProgress((itemsLoaded / itemsTotal) * FILES_SHARE)
    setStatus(`Bestanden laden… ${itemsLoaded}/${itemsTotal} (${url.split('/').pop()})`)
  }

  manager.onError = (url) => {
    showError(`Kon ${url} niet laden. Staat het bestand in public/?`)
  }

  function setProgress(fraction) {
    bar.style.width = `${Math.round(fraction * 100)}%`
  }

  function setStatus(text) {
    status.textContent = text
  }

  function showError(text) {
    element.classList.add('error')
    setStatus(text)
  }

  // Shaders compileren VÓÓR de eerste frame: anders hapert het spel bij de start.
  // (Het gras met 140 000 sprieten en de TSL-shaders zijn hier het zwaarst.)
  async function compile(renderer, scene, camera) {
    setStatus('Shaders compileren…')
    setProgress(FILES_SHARE)
    await renderer.compileAsync(scene, camera)
    setProgress(1)
  }

  // Uitfaden met een CSS-transition, daarna helemaal verwijderen
  function hide() {
    setStatus('Klaar!')
    element.classList.add('done')
    element.addEventListener('transitionend', () => element.remove(), { once: true })
  }

  return { manager, setStatus, setProgress, showError, compile, hide }
}
