(async () => {
  const response = await fetch("/api/now")
  if (response.ok) {
    const data = await response.json()
    document.querySelector("#now").innerText = data.now;
    document.querySelector("#zone").innerText = data.zone;
  }
})()
