# Pusula sayfa turu — her sayfa 7 saniye gösterilir
$base = "http://localhost:3000"
$sayfalar = @(
  @{ url = "/"; ad = "1/7 Landing" },
  @{ url = "/auth/login"; ad = "2/7 Giris" },
  @{ url = "/auth/signup"; ad = "3/7 Beta'ya Katil" },
  @{ url = "/dashboard"; ad = "4/7 Dashboard (login redirect)" },
  @{ url = "/settings"; ad = "5/7 Settings BYOK" },
  @{ url = "/legal/kvkk"; ad = "6/7 KVKK" },
  @{ url = "/legal/kullanim"; ad = "7/7 Kullanim Sartlari" }
)

foreach ($s in $sayfalar) {
  Write-Host ("==> " + $s.ad + "  " + $base + $s.url)
  Start-Process "msedge.exe" -ArgumentList ($base + $s.url)
  Start-Sleep -Seconds 7
}

Write-Host ""
Write-Host "Tur bitti. Edge'de 7 yeni sekme acildi."
Read-Host "Enter ile cikis"
