import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireAuth, GuestOnly } from './components/Guards';
import { LoadingBlock } from './components/ui';
import Home from './pages/Home';

const Register = lazy(() => import('./pages/auth/Register'));
const CheckInbox = lazy(() => import('./pages/auth/CheckInbox'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const Login = lazy(() => import('./pages/auth/Login'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Universities = lazy(() => import('./pages/catalog/Universities'));
const Majors = lazy(() => import('./pages/catalog/Majors'));
const Courses = lazy(() => import('./pages/catalog/Courses'));
const CourseLayout = lazy(() => import('./pages/course/CourseLayout'));
const Overview = lazy(() => import('./pages/course/Overview'));
const Reviews = lazy(() => import('./pages/course/Reviews'));
const Midterms = lazy(() => import('./pages/course/Midterms'));
const Combos = lazy(() => import('./pages/course/Combos'));
const WriteReview = lazy(() => import('./pages/course/WriteReview'));
const RateMidterm = lazy(() => import('./pages/course/RateMidterm'));
const ResourcesPage = lazy(() => import('./pages/resources/ResourcesPage'));
const ResourceDetail = lazy(() => import('./pages/resources/ResourceDetail'));
const UploadResource = lazy(() => import('./pages/resources/UploadResource'));
const MyReviews = lazy(() => import('./pages/profile/MyReviews'));
const MyUploads = lazy(() => import('./pages/profile/MyUploads'));
const Bookmarks = lazy(() => import('./pages/profile/Bookmarks'));
const Settings = lazy(() => import('./pages/profile/Settings'));
const ReportQueue = lazy(() => import('./pages/moderation/ReportQueue'));
const ReportedItem = lazy(() => import('./pages/moderation/ReportedItem'));
const ModerationLog = lazy(() => import('./pages/moderation/ModerationLog'));
const AdminCatalog = lazy(() => import('./pages/admin/Catalog'));
const AdminSuggestions = lazy(() => import('./pages/admin/Suggestions'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminStats = lazy(() => import('./pages/admin/Stats'));
const StaticPage = lazy(() => import('./pages/static/StaticPage'));
const SuggestCourse = lazy(() => import('./pages/static/SuggestCourse'));
const NotFound = lazy(() => import('./pages/static/NotFound'));

const Fallback = () => (
  <div className="container-page py-12">
    <LoadingBlock />
  </div>
);
const guest = (el) => <GuestOnly>{el}</GuestOnly>;
const auth = (el, roles) => <RequireAuth roles={roles}>{el}</RequireAuth>;
const MOD = ['moderator', 'admin'];
const ADMIN = ['admin'];

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Account access screens use their own two-column layout. */}
        <Route path="/register" element={guest(<Register />)} />
        <Route path="/verify-email" element={<CheckInbox />} />
        <Route path="/verify/:token" element={<VerifyEmail />} />
        <Route path="/login" element={guest(<Login />)} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="universities" element={<Universities />} />
          <Route path="universities/:id" element={<Majors />} />
          <Route path="majors/:id" element={<Courses />} />
          <Route path="courses/:id" element={<CourseLayout />}>
            <Route index element={<Overview />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="midterms" element={<Midterms />} />
            <Route path="combos" element={<Combos />} />
          </Route>
          <Route path="courses/:id/resources" element={<ResourcesPage scoped />} />
          <Route path="courses/:id/review" element={auth(<WriteReview />)} />
          <Route path="reviews/:reviewId/edit" element={auth(<WriteReview />)} />
          <Route path="courses/:id/rate" element={auth(<RateMidterm />)} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="resources/upload" element={auth(<UploadResource />)} />
          <Route path="resources/:id" element={<ResourceDetail />} />
          <Route path="resources/:id/edit" element={auth(<UploadResource />)} />

          <Route path="me" element={<Navigate to="/me/reviews" replace />} />
          <Route path="me/reviews" element={auth(<MyReviews />)} />
          <Route path="me/uploads" element={auth(<MyUploads />)} />
          <Route path="me/bookmarks" element={auth(<Bookmarks />)} />
          <Route path="me/settings" element={auth(<Settings />)} />

          <Route path="moderation" element={auth(<ReportQueue />, MOD)} />
          <Route path="moderation/reports/:reportId" element={auth(<ReportedItem />, MOD)} />
          <Route path="moderation/log" element={auth(<ModerationLog />, MOD)} />

          <Route path="admin" element={<Navigate to="/admin/catalog" replace />} />
          <Route path="admin/catalog" element={auth(<AdminCatalog />, ADMIN)} />
          <Route path="admin/suggestions" element={auth(<AdminSuggestions />, ADMIN)} />
          <Route path="admin/users" element={auth(<AdminUsers />, ADMIN)} />
          <Route path="admin/stats" element={auth(<AdminStats />, ADMIN)} />

          <Route path="about" element={<StaticPage page="about" />} />
          <Route path="guidelines" element={<StaticPage page="guidelines" />} />
          <Route path="suggest-course" element={<SuggestCourse />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
