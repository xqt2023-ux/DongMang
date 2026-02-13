# Babelark AI Integration Test Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Babelark AI Integration Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000/ai"

# Test 1: Health Check
Write-Host "[Test 1] Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "OK Service is healthy" -ForegroundColor Green
    Write-Host $($health | ConvertTo-Json -Compress) -ForegroundColor Gray
} catch {
    Write-Host "FAILED Health check failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Storyboard Generation (Gemini 3 Flash)
Write-Host "[Test 2] Storyboard Generation (Gemini 3 Flash)..." -ForegroundColor Yellow
try {
    $storyboardRequest = @{
        prompt = "A cute orange cat chasing colorful butterflies under cherry blossom trees"
        style = "japanese"
        sceneCount = 3
    } | ConvertTo-Json
    
    $storyboard = Invoke-RestMethod -Uri "$baseUrl/storyboard/generate" -Method Post -ContentType "application/json" -Body $storyboardRequest
    
    Write-Host "OK Storyboard generated successfully!" -ForegroundColor Green
    Write-Host "Title: $($storyboard.title)" -ForegroundColor Cyan
    Write-Host "Style: $($storyboard.style)" -ForegroundColor Cyan
    Write-Host "Scenes: $($storyboard.scenes.Count)" -ForegroundColor Cyan
    
    foreach ($scene in $storyboard.scenes) {
        $desc = $scene.description.Substring(0, [Math]::Min(60, $scene.description.Length))
        Write-Host "  Scene $($scene.order): $desc..." -ForegroundColor Gray
    }
    
    $global:firstSceneDescription = $storyboard.scenes[0].description
    
} catch {
    Write-Host "FAILED Storyboard generation failed: $_" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Image Generation (Gemini 3 Pro Image)
Write-Host "[Test 3] Image Generation (Gemini 3 Pro Image)..." -ForegroundColor Yellow
try {
    $imageRequest = @{
        description = "An orange cat reaching out to catch a blue butterfly under pink cherry blossoms, Japanese anime style, bright colors"
        style = "japanese"
        resolution = @{
            width = 1080
            height = 1920
        }
    } | ConvertTo-Json
    
    $image = Invoke-RestMethod -Uri "$baseUrl/image/generate" -Method Post -ContentType "application/json" -Body $imageRequest
    
    Write-Host "OK Image generated successfully!" -ForegroundColor Green
    Write-Host "Image URL: $($image.imageUrl)" -ForegroundColor Cyan
    
    $global:imageUrl = $image.imageUrl
    
} catch {
    Write-Host "FAILED Image generation failed: $_" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Video Generation (Doubao Seedance)
Write-Host "[Test 4] Video Generation (Doubao Seedance - Image-to-Video)..." -ForegroundColor Yellow
if ($global:imageUrl) {
    try {
        $videoRequest = @{
            prompt = "Cat jumps up to chase the butterfly, butterfly flies around dodging, smooth motion"
            imageUrl = $global:imageUrl
            duration = 5
            resolution = "720P"
            aspectRatio = "9:16"
            useAliModel = $false
        } | ConvertTo-Json
        
        $video = Invoke-RestMethod -Uri "$baseUrl/video/generate" -Method Post -ContentType "application/json" -Body $videoRequest
        
        Write-Host "OK Video task created successfully!" -ForegroundColor Green
        Write-Host "Task ID: $($video.taskId)" -ForegroundColor Cyan
        Write-Host "Status: $($video.status)" -ForegroundColor Cyan
        
        $global:videoTaskId = $video.taskId
        
    } catch {
        Write-Host "FAILED Video generation failed: $_" -ForegroundColor Red
        Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED (Image generation failed)" -ForegroundColor Gray
}
Write-Host ""

# Test 5: Query Video Status
if ($global:videoTaskId) {
    Write-Host "[Test 5] Query Video Generation Status..." -ForegroundColor Yellow
    try {
        $statusRequest = @{
            taskId = $global:videoTaskId
            useAliModel = $false
        } | ConvertTo-Json
        
        $status = Invoke-RestMethod -Uri "$baseUrl/video/status" -Method Post -ContentType "application/json" -Body $statusRequest
        
        Write-Host "OK Status query successful!" -ForegroundColor Green
        Write-Host "Task ID: $($status.taskId)" -ForegroundColor Cyan
        Write-Host "Status: $($status.status)" -ForegroundColor Cyan
        Write-Host "Progress: $($status.progress)%" -ForegroundColor Cyan
        
        if ($status.videoUrl) {
            Write-Host "Video URL: $($status.videoUrl)" -ForegroundColor Cyan
        } else {
            Write-Host "INFO Video is generating, usually takes 30-120 seconds..." -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "FAILED Status query failed: $_" -ForegroundColor Red
        Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Test Complete" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
