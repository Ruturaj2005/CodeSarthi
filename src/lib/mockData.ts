import type { Repository, ExecutionFlow, LearningStep } from "./types";

export const LEARNING_PATH: LearningStep[] = [
  {
    id: "ls1",
    step: 1,
    title: "Project Overview",
    duration: "2 min",
    description: "Understand what this Django REST API does and its overall architecture.",
    relatedNodes: ["n1"],
    status: "completed",
  },
  {
    id: "ls2",
    step: 2,
    title: "Entry Point",
    duration: "3 min",
    description: "manage.py and wsgi.py — how the Django application boots up.",
    relatedNodes: ["n1", "n8"],
    status: "current",
  },
  {
    id: "ls3",
    step: 3,
    title: "URL Routing Layer",
    duration: "5 min",
    description: "How incoming HTTP requests are routed to the correct handlers.",
    relatedNodes: ["n2"],
    status: "locked",
  },
  {
    id: "ls4",
    step: 4,
    title: "Views & Controllers",
    duration: "8 min",
    description: "The business logic layer — where requests are processed.",
    relatedNodes: ["n3", "n4"],
    status: "locked",
  },
  {
    id: "ls5",
    step: 5,
    title: "Database Models",
    duration: "6 min",
    description: "Data structure, ORM models, and relationships between tables.",
    relatedNodes: ["n6", "n7"],
    status: "locked",
  },
  {
    id: "ls6",
    step: 6,
    title: "Authentication System",
    duration: "7 min",
    description: "Login, JWT tokens, permissions, and session management.",
    relatedNodes: ["n3", "n5"],
    status: "locked",
  },
  {
    id: "ls7",
    step: 7,
    title: "API Serializers",
    duration: "5 min",
    description: "How data is validated and formatted for API responses.",
    relatedNodes: ["n4"],
    status: "locked",
  },
  {
    id: "ls8",
    step: 8,
    title: "Settings & Configuration",
    duration: "3 min",
    description: "Environment variables, database config, installed apps.",
    relatedNodes: ["n8"],
    status: "locked",
  },
];

export const LOGIN_FLOW: ExecutionFlow = {
  id: "login",
  title: "Login & Authentication Flow",
  description: "Complete walkthrough of how user authentication works end-to-end",
  icon: "🔐",
  steps: [
    {
      id: "s1",
      step: 1,
      title: "User Submits Login Form",
      nodeId: "n9",
      description: "User enters email and password in the React frontend. The form validates inputs client-side before submission.",
      descriptionHi: "User अपना email और password React frontend में enter करता है। Form client-side पर inputs validate करता है submission से पहले।",
      functionName: "handleSubmit()",
      language: "typescript",
      codeSnippet: `const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setLoading(true);
  
  const response = await authService.login({
    email: formData.email,
    password: formData.password,
  });
  
  if (response.token) {
    localStorage.setItem('auth_token', response.token);
    router.push('/dashboard');
  }
};`,
    },
    {
      id: "s2",
      step: 2,
      title: "API Request Sent",
      nodeId: "n5",
      description: "authService.js calls POST /api/auth/login with credentials. Axios interceptors add CSRF headers automatically.",
      descriptionHi: "authService.js, POST /api/auth/login को credentials के साथ call करता है। Axios interceptors automatically CSRF headers add करते हैं।",
      functionName: "authService.login()",
      language: "javascript",
      codeSnippet: `// authService.js
export const authService = {
  login: async (credentials) => {
    const response = await axios.post(
      '/api/auth/login/',
      credentials,
      {
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'Content-Type': 'application/json',
        }
      }
    );
    return response.data;
  }
};`,
    },
    {
      id: "s3",
      step: 3,
      title: "URL Router Dispatches",
      nodeId: "n2",
      description: "Django's URL router matches /api/auth/login/ and dispatches to the AuthController view class.",
      descriptionHi: "Django का URL router /api/auth/login/ को match करता है और AuthController view class पर dispatch करता है।",
      functionName: "urlpatterns",
      language: "python",
      codeSnippet: `# urls.py
from django.urls import path
from .views import AuthController

urlpatterns = [
    path(
        'api/auth/login/', 
        AuthController.as_view(),
        name='auth-login'
    ),
    path(
        'api/auth/refresh/',
        TokenRefreshView.as_view(),
        name='token-refresh'
    ),
]`,
    },
    {
      id: "s4",
      step: 4,
      title: "Controller Validates",
      nodeId: "n3",
      description: "AuthController.post() receives the request. Uses LoginSerializer to validate email format and password strength.",
      descriptionHi: "AuthController.post() request receive करता है। LoginSerializer use करके email format और password strength validate करता है।",
      functionName: "AuthController.post()",
      language: "python",
      codeSnippet: `# views/auth.py
class AuthController(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(
            data=request.data
        )
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Delegate to service layer
        return AuthService.authenticate(
            serializer.validated_data
        )`,
    },
    {
      id: "s5",
      step: 5,
      title: "Database Query",
      nodeId: "n6",
      description: "User model queries PostgreSQL to find the account. Django's ORM generates a parameterized SQL query — safe from SQL injection.",
      descriptionHi: "User model PostgreSQL को query करता है account find करने के लिए। Django का ORM parameterized SQL query generate करता है — SQL injection से safe।",
      functionName: "User.objects.get()",
      language: "python",
      codeSnippet: `# models/user.py
class User(AbstractBaseUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Used by AuthService
    @classmethod
    def find_by_email(cls, email: str):
        return cls.objects.select_related(
            'profile'
        ).get(
            email=email,
            is_active=True
        )`,
    },
    {
      id: "s6",
      step: 6,
      title: "JWT Token Generated",
      nodeId: "n5",
      description: "tokenUtils.py generates a signed JWT access token (15 min expiry) and refresh token (7 days). Tokens are signed with the server's SECRET_KEY.",
      descriptionHi: "tokenUtils.py एक signed JWT access token (15 min expiry) और refresh token (7 days) generate करता है। Tokens server के SECRET_KEY से sign होते हैं।",
      functionName: "generate_tokens()",
      language: "python",
      codeSnippet: `# utils/tokens.py
from rest_framework_simplejwt.tokens import RefreshToken

def generate_tokens(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    
    # Add custom claims
    refresh['username'] = user.username
    refresh['role'] = user.profile.role
    
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'expires_in': 900,  # 15 minutes
        'user': UserSerializer(user).data
    }`,
    },
  ],
};

export const API_FLOW: ExecutionFlow = {
  id: "api-request",
  title: "API Request Lifecycle",
  description: "How a REST API request travels through the system",
  icon: "🔄",
  steps: [
    {
      id: "a1", step: 1, title: "Client Request", nodeId: "n9",
      description: "React component calls the API via axios with auth headers.",
      descriptionHi: "React component axios के through auth headers के साथ API call करता है।",
      functionName: "apiClient.get()",
      language: "typescript",
      codeSnippet: `const { data } = await apiClient.get('/api/users/', {
  params: { page: 1, limit: 20 },
});`,
    },
    {
      id: "a2", step: 2, title: "Auth Middleware", nodeId: "n4",
      description: "JWT middleware validates the access token before the request reaches the view.",
      descriptionHi: "JWT middleware access token validate करता है request view तक पहुंचने से पहले।",
      functionName: "JWTAuthentication.authenticate()",
      language: "python",
      codeSnippet: `class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = self.get_raw_token(request)
        validated = self.get_validated_token(token)
        return self.get_user(validated), validated`,
    },
    {
      id: "a3", step: 3, title: "View Processes", nodeId: "n3",
      description: "The view applies filters, calls the service layer, and paginates results.",
      descriptionHi: "View filters apply करता है, service layer call करता है, और results paginate करता है।",
      functionName: "UserListView.get()",
      language: "python",
      codeSnippet: `class UserListView(ListAPIView):
    serializer_class = UserSerializer
    pagination_class = StandardPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email']`,
    },
    {
      id: "a4", step: 4, title: "Database Query", nodeId: "n6",
      description: "ORM generates optimized SQL with select_related to avoid N+1 queries.",
      descriptionHi: "ORM optimized SQL generate करता है N+1 queries avoid करने के लिए।",
      functionName: "User.objects.all()",
      language: "python",
      codeSnippet: `queryset = User.objects.select_related(
    'profile'
).prefetch_related(
    'permissions'
).filter(is_active=True)`,
    },
    {
      id: "a5", step: 5, title: "Response Serialized", nodeId: "n4",
      description: "Serializer converts model instances to JSON, applying field-level permissions.",
      descriptionHi: "Serializer model instances को JSON में convert करता है, field-level permissions apply करके।",
      functionName: "UserSerializer.to_representation()",
      language: "python",
      codeSnippet: `class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
        
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']`,
    },
  ],
};

export const MOCK_REPO: Repository = {
  id: "repo1",
  url: "https://github.com/example/django-rest-api",
  name: "django-rest-api",
  description: "A production-ready Django REST API with JWT authentication, user management, and PostgreSQL.",
  language: "Python",
  framework: "Django REST Framework",
  projectType: "REST API Backend",
  complexity: "intermediate",
  stats: {
    files: 87,
    linesOfCode: 12400,
    contributors: 6,
    stars: 2340,
  },
  nodes: [
    {
      id: "n1",
      label: "manage.py",
      type: "entry",
      file: "manage.py",
      x: 460,
      y: 40,
      description: "Django's command-line utility for administrative tasks. This is the entry point of the entire application.",
      functions: ["main()", "execute_from_command_line()"],
      dependencies: ["django", "os", "sys"],
      codePreview: `#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault(
        'DJANGO_SETTINGS_MODULE',
        'config.settings'
    )
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()`,
      linesOfCode: 22,
      complexity: "low",
      layer: "frontend",
      group: "core",
      importance: 6,
    },
    {
      id: "n2",
      label: "urls.py",
      type: "page",
      file: "config/urls.py",
      x: 460,
      y: 180,
      description: "Root URL configuration. Routes all incoming HTTP requests to the appropriate view handlers.",
      functions: ["urlpatterns"],
      dependencies: ["django.urls", "apps.users.urls", "apps.auth.urls"],
      codePreview: `from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('apps.auth.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/posts/', include('apps.posts.urls')),
]`,
      linesOfCode: 18,
      complexity: "low",
      layer: "routing",
      group: "core",
      importance: 8,
    },
    {
      id: "n3",
      label: "AuthController",
      type: "controller",
      file: "apps/auth/views.py",
      x: 220,
      y: 320,
      description: "Handles all authentication endpoints — login, logout, register, and password reset.",
      functions: ["post()", "delete()", "patch()"],
      dependencies: ["rest_framework", "LoginSerializer", "AuthService"],
      codePreview: `class AuthController(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        return AuthService.authenticate(
            serializer.validated_data
        )`,
      linesOfCode: 64,
      complexity: "medium",
      layer: "logic",
      group: "auth",
      importance: 9,
    },
    {
      id: "n4",
      label: "UserSerializer",
      type: "service",
      file: "apps/users/serializers.py",
      x: 700,
      y: 320,
      description: "Converts User model instances to/from JSON. Handles field validation and nested serialization.",
      functions: ["validate()", "create()", "to_representation()"],
      dependencies: ["rest_framework.serializers", "User", "Profile"],
      codePreview: `class UserSerializer(ModelSerializer):
    full_name = SerializerMethodField()
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
        
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name',
                  'created_at', 'is_active']`,
      linesOfCode: 89,
      complexity: "medium",
      layer: "logic",
      group: "users",
      importance: 7,
    },
    {
      id: "n5",
      label: "AuthService",
      type: "service",
      file: "apps/auth/services.py",
      x: 220,
      y: 460,
      description: "Business logic for authentication. Validates credentials, generates JWT tokens, handles refresh flow.",
      functions: ["authenticate()", "generate_tokens()", "refresh_token()", "revoke()"],
      dependencies: ["User", "tokenUtils", "bcrypt"],
      codePreview: `class AuthService:
    @staticmethod
    def authenticate(validated_data: dict):
        try:
            user = User.find_by_email(
                validated_data['email']
            )
        except User.DoesNotExist:
            raise AuthenticationFailed()
            
        if not user.check_password(
            validated_data['password']
        ):
            raise AuthenticationFailed()
            
        return Response(generate_tokens(user))`,
      linesOfCode: 112,
      complexity: "high",
      layer: "logic",
      group: "auth",
      importance: 9,
    },
    {
      id: "n6",
      label: "User Model",
      type: "model",
      file: "apps/users/models.py",
      x: 460,
      y: 580,
      description: "Core User data model. Extends Django's AbstractBaseUser for custom authentication fields.",
      functions: ["find_by_email()", "check_password()", "save()"],
      dependencies: ["django.db.models", "AbstractBaseUser", "Profile"],
      codePreview: `class User(AbstractBaseUser):
    email    = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    
    USERNAME_FIELD = 'email'
    
    @classmethod
    def find_by_email(cls, email: str):
        return cls.objects.get(
            email=email, is_active=True
        )`,
      linesOfCode: 156,
      complexity: "medium",
      layer: "data",
      group: "users",
      importance: 8,
    },
    {
      id: "n7",
      label: "PostgreSQL",
      type: "model",
      file: "Database",
      x: 700,
      y: 580,
      description: "PostgreSQL database. Stores all application data with proper indexing and constraints.",
      functions: ["SELECT", "INSERT", "UPDATE", "INDEX"],
      dependencies: ["psycopg2", "django.db"],
      codePreview: `-- users table
CREATE TABLE users_user (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(254) UNIQUE NOT NULL,
    username   VARCHAR(150) NOT NULL,
    password   VARCHAR(128) NOT NULL,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_email
    ON users_user(email);`,
      linesOfCode: 0,
      complexity: "medium",
      layer: "data",
      group: "core",
      importance: 7,
    },
    {
      id: "n8",
      label: "settings.py",
      type: "config",
      file: "config/settings.py",
      x: 700,
      y: 170,
      description: "Django settings — database config, installed apps, middleware, JWT settings, CORS configuration.",
      functions: ["configure()"],
      dependencies: ["django", "environ", "rest_framework"],
      codePreview: `import environ
env = environ.Env()

DATABASES = {
    'default': env.db('DATABASE_URL')
}

INSTALLED_APPS = [
    'rest_framework',
    'corsheaders',
    'apps.users',
    'apps.auth',
]

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}`,
      linesOfCode: 210,
      complexity: "medium",
      layer: "infra",
      group: "core",
      importance: 3,
    },
    {
      id: "n9",
      label: "React Frontend",
      type: "page",
      file: "frontend/src/pages/Login.tsx",
      x: 100,
      y: 40,
      description: "React login page component. Handles form state, validation, and API communication.",
      functions: ["handleSubmit()", "validate()", "handleChange()"],
      dependencies: ["authService", "react-hook-form", "axios"],
      codePreview: `export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const tokens = await authService.login(data);
    if (tokens.access) {
      router.push('/dashboard');
    }
  };
  
  return <LoginForm onSubmit={onSubmit} />;
}`,
      linesOfCode: 98,
      complexity: "medium",
      layer: "frontend",
      group: "frontend",
      importance: 8,
    },
  ],
  edges: [
    { id: "e1", source: "n9", target: "n1", label: "HTTP request" },
    { id: "e2", source: "n1", target: "n2", label: "routes" },
    { id: "e3", source: "n2", target: "n3", label: "auth routes" },
    { id: "e4", source: "n2", target: "n4", label: "user routes" },
    { id: "e5", source: "n3", target: "n5", label: "delegates" },
    { id: "e6", source: "n4", target: "n6", label: "queries" },
    { id: "e7", source: "n5", target: "n6", label: "queries" },
    { id: "e8", source: "n6", target: "n7", label: "reads/writes" },
    { id: "e9", source: "n2", target: "n8", label: "uses config" },
    { id: "e10", source: "n3", target: "n4", label: "uses serializer" },
  ],
  flows: [LOGIN_FLOW, API_FLOW],
  learningPath: LEARNING_PATH,
};

export const CHAT_MESSAGES_EN = [
  { role: "user", content: "How does authentication work in this project?" },
  {
    role: "assistant",
    content: `**Authentication uses JWT (JSON Web Tokens).**

Here's the flow:

1. \`LoginPage.tsx\` → collects credentials
2. \`authService.js\` → calls \`POST /api/auth/login/\`
3. \`AuthController.post()\` → validates via \`LoginSerializer\`
4. \`AuthService.authenticate()\` → checks password hash
5. \`User.find_by_email()\` → database lookup
6. Returns access token (15 min) + refresh token (7 days)

**Key files:**
- 📄 \`apps/auth/views.py\` — Controller
- ⚙️ \`apps/auth/services.py\` — Business logic
- 🗄️ \`apps/users/models.py\` — User model`,
  },
];

export const CHAT_MESSAGES_HI = [
  { role: "user", content: "Login flow kaise kaam karta hai?" },
  {
    role: "assistant",
    content: `**Authentication JWT (JSON Web Tokens) use करता है।**

यह इस तरह काम करता है:

1. \`LoginPage.tsx\` → user से credentials collect करता है
2. \`authService.js\` → \`POST /api/auth/login/\` पर request भेजता है
3. \`AuthController.post()\` → \`LoginSerializer\` से validate करता है
4. \`AuthService.authenticate()\` → password hash check करता है
5. \`User.find_by_email()\` → database में user ढूंढता है
6. Access token (15 min) + Refresh token (7 days) return करता है

**Important files:**
- 📄 \`apps/auth/views.py\` — Controller
- ⚙️ \`apps/auth/services.py\` — Business logic
- 🗄️ \`apps/users/models.py\` — User model`,
  },
];

export const HACKATHON_TRIAGE = {
  timeLeft: 24,
  mustRead: [
    { file: "manage.py", desc: "App entry point" },
    { file: "apps/auth/views.py", desc: "Authentication controller" },
    { file: "apps/users/models.py", desc: "Core data model" },
    { file: "config/urls.py", desc: "All API routes" },
  ],
  shouldRead: [
    { file: "apps/auth/services.py", desc: "Auth business logic" },
    { file: "apps/users/serializers.py", desc: "Data validation" },
    { file: "config/settings.py", desc: "App configuration" },
  ],
  canSkip: [
    { file: "tests/", desc: "Not needed for building" },
    { file: "docs/", desc: "Skim only" },
    { file: "scripts/", desc: "Deployment utilities" },
  ],
  tip: "Start by running the app and testing the login API with Postman. Then trace it back through the code.",
};

export const CONTRIBUTION_SCORE = {
  score: 73,
  strengths: [
    "You understand the URL routing layer",
    "You understand the authentication system",
    "You understand the database models",
  ],
  warnings: ["Review the caching layer (Redis integration)"],
  gaps: ["Study the background job queue (Celery)"],
  suggestedIssues: [
    "Add input validation to the profile update API",
    "Improve error messages for failed authentication",
  ],
};

export const PLATFORM_STATS = [
  { label: "Repositories Analyzed", value: "12,400+" },
  { label: "Student Users", value: "8,200+" },
  { label: "Colleges", value: "200+" },
  { label: "Indian Languages", value: "8" },
];

export const PAIN_POINTS = [
  {
    icon: "🧱",
    title: "The Open Source Wall",
    description:
      "A student from Bhopal clones a repo with 200 files. They don't know where the app starts, what connects to what. They close the terminal and give up.",
    stat: "87% of students abandon repos in the first hour",
  },
  {
    icon: "🗣️",
    title: "English-Only Documentation",
    description:
      "All docs, comments, and tutorials are in English — adding enormous cognitive load for students whose native language is Hindi, Telugu, or Tamil.",
    stat: "Only 12% of engineering students are comfortable in English",
  },
  {
    icon: "🧑‍🏫",
    title: "No Mentor, No Money",
    description:
      "IIT students have professors and industry networks. Students at private colleges in smaller cities learn alone — from YouTube and Stack Overflow.",
    stat: "1.5 million engineers graduate every year, most without mentorship",
  },
  {
    icon: "⏱️",
    title: "Hackathon Panic",
    description:
      "In 24-36 hour hackathons, students spend the first 8 hours just understanding starter code — leaving barely any time to actually build.",
    stat: "SIH, Hack36, HackWithInfy — 8 hours lost per hackathon",
  },
  {
    icon: "💼",
    title: "Interview Unpreparedness",
    description:
      "When asked to explain a project's architecture, most students can't — they used it but never truly understood it. This kills placement interviews.",
    stat: "TCS, Infosys, startups — architecture questions are standard",
  },
  {
    icon: "📶",
    title: "Low Bandwidth Reality",
    description:
      "Students in Tier 2 and Tier 3 cities rely on mobile hotspots. Heavy tools simply don't work for them — CodeSarthi has a 2G-ready mode.",
    stat: "Average internet speed outside metros: 8 Mbps",
  },
];

export const CORE_FEATURES = [
  {
    icon: "🗺️",
    title: "CodeMap",
    description: "Interactive architecture graph. Click any node to explore files, understand relationships, and trace dependencies visually.",
    color: "#6E56CF",
    tag: "Visual",
  },
  {
    icon: "▶️",
    title: "Execution Flows",
    description: "Animated step-by-step walkthroughs of login, API requests, database queries — every flow explained like a senior engineer would.",
    color: "#00D2A0",
    tag: "Interactive",
  },
  {
    icon: "🌐",
    title: "Bharat Mode",
    description: "Every explanation in Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, and Gujarati. Technical terms stay in English, explanations in your language.",
    color: "#F5A623",
    tag: "India-first",
  },
  {
    icon: "⏱️",
    title: "Hackathon Mode",
    description: "Enter your time limit. Get an instant triage report — what to read first, what to skim, what to skip. Built for SIH and Hack36.",
    color: "#FF4D6D",
    tag: "Unique",
  },
  {
    icon: "📚",
    title: "Learning Path",
    description: "Duolingo-style structured roadmap for each repository. Earn a completion badge. Track progress. Learn at your own pace.",
    color: "#3B82F6",
    tag: "Gamified",
  },
  {
    icon: "🤖",
    title: "AI Sarthi Chat",
    description: "Ask in English or Hindi — 'How does authentication work?' or 'Login flow kaise kaam karta hai?' — and get code-aware answers.",
    color: "#A855F7",
    tag: "AI-powered",
  },
];
