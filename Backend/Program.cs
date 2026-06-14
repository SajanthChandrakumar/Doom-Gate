using DoomGate.Api.Endpoints;
using DoomGate.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// --- OpenAPI / Swagger ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- CORS for the Vanilla JS frontend ---
const string FrontendCors = "AllowFrontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCors, policy => policy
        .WithOrigins(
            "http://localhost:3000", "http://127.0.0.1:3000",
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:8080")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// --- HttpClient for the Gemini REST API ---
builder.Services.AddHttpClient("Gemini", client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
});

// --- Game services (single-player, in-memory: GameState is the shared world) ---
builder.Services.AddSingleton<GameState>();
builder.Services.AddSingleton<GamificationService>();
builder.Services.AddSingleton<CasinoService>();
builder.Services.AddSingleton<FocusGuardService>();
builder.Services.AddSingleton<QuizService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(FrontendCors);

app.MapDoomGateEndpoints();

app.Run();
