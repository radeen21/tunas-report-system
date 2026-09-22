import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/*
 * =========================================================
 * ENV
 * =========================================================
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY!;

/*
 * =========================================================
 * CLIENT UNTUK MEMERIKSA USER LOGIN
 * =========================================================
 */

const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

/*
 * =========================================================
 * ADMIN CLIENT
 * =========================================================
 *
 * SECRET KEY HANYA DI SERVER.
 */

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

/*
 * =========================================================
 * NORMALIZE NIS
 * =========================================================
 */

function normalizeNis(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/*
 * =========================================================
 * GENERATE PASSWORD
 * =========================================================
 */

function generatePassword() {
  const random = crypto
    .randomBytes(6)
    .toString("base64url");

  return `Hstkb@${random}`;
}

/*
 * =========================================================
 * POST
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * 1. CEK ENV
     * =====================================================
     */

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "NEXT_PUBLIC_SUPABASE_URL belum tersedia.",
        },
        { status: 500 }
      );
    }

    if (!supabasePublishableKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum tersedia.",
        },
        { status: 500 }
      );
    }

    if (!supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "SUPABASE_SECRET_KEY belum tersedia.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * 2. AMBIL AUTHORIZATION TOKEN
     * =====================================================
     */

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authorization token tidak ditemukan.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization
        .replace("Bearer ", "")
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Access token kosong.",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * 3. VALIDASI SESSION USER
     * =====================================================
     */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAuth.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authData.user
    ) {
      console.error(
        "Auth error:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Session login tidak valid. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    const currentUser =
      authData.user;

    const currentUserId =
      currentUser.id;

    const currentUserEmail =
      currentUser.email
        ?.trim()
        .toLowerCase() || "";

    console.log(
      "Student account generator - logged user:",
      {
        id: currentUserId,
        email: currentUserEmail,
      }
    );

    /*
     * =====================================================
     * 4. CARI USERS_PROFILE
     * =====================================================
     *
     * Prioritas:
     *
     * A. users_profile.id = auth user id
     *
     * B. users_profile.email = auth user email
     */

    type UserProfile = {
      id: string;
      full_name: string | null;
      email: string | null;
      role: string | null;
      is_active: boolean | null;
    };

    let currentProfile:
      | UserProfile
      | null = null;

    /*
     * -----------------------------------------------------
     * 4A. CARI BERDASARKAN ID
     * -----------------------------------------------------
     */

    const {
      data: profileById,
      error: profileByIdError,
    } =
      await supabaseAdmin
        .from("users_profile")
        .select(
          "id, full_name, email, role, is_active"
        )
        .eq(
          "id",
          currentUserId
        )
        .maybeSingle();

    if (profileByIdError) {
      console.error(
        "Profile lookup by ID error:",
        profileByIdError
      );
    }

    if (profileById) {
      currentProfile =
        profileById as UserProfile;
    }

    /*
     * -----------------------------------------------------
     * 4B. FALLBACK CARI BERDASARKAN EMAIL
     * -----------------------------------------------------
     */

    if (
      !currentProfile &&
      currentUserEmail
    ) {
      const {
        data: profileByEmail,
        error: profileByEmailError,
      } =
        await supabaseAdmin
          .from("users_profile")
          .select(
            "id, full_name, email, role, is_active"
          )
          .ilike(
            "email",
            currentUserEmail
          )
          .limit(1)
          .maybeSingle();

      if (profileByEmailError) {
        console.error(
          "Profile lookup by email error:",
          profileByEmailError
        );
      }

      if (profileByEmail) {
        currentProfile =
          profileByEmail as UserProfile;
      }
    }

    /*
     * =====================================================
     * 5. PROFILE TIDAK DITEMUKAN
     * =====================================================
     */

    if (!currentProfile) {
      console.error(
        "USER PROFILE TIDAK DITEMUKAN",
        {
          authUserId:
            currentUserId,

          authEmail:
            currentUserEmail,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Profile user yang sedang login tidak ditemukan di users_profile.",
          debug: {
            auth_user_id:
              currentUserId,
            auth_email:
              currentUserEmail,
          },
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * 6. CEK USER AKTIF
     * =====================================================
     */

    if (
      currentProfile.is_active ===
      false
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akun admin sedang tidak aktif.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * 7. VALIDASI ROLE
     * =====================================================
     */

    const role =
      String(
        currentProfile.role || ""
      )
        .toLowerCase()
        .trim();

    /*
     * Beberapa variasi role yang mungkin
     * digunakan di database.
     */

    const normalizedRole =
      role.replace(
        /[\s-]+/g,
        "_"
      );

    const allowedRoles = [
      "admin",
      "super_admin",
      "superadmin",
      "kepala_sekolah",
      "kepalasekolah",
    ];

    if (
      !allowedRoles.includes(
        normalizedRole
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Role "${currentProfile.role}" tidak memiliki izin untuk membuat akun siswa.`,
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * 8. AMBIL SEMUA SISWA
     * =====================================================
     */

    const {
      data: students,
      error: studentsError,
    } =
      await supabaseAdmin
        .from("students")
        .select(
          `
          id,
          full_name,
          nis,
          nisn,
          level,
          grade,
          status,
          user_id
          `
        )
        .order(
          "full_name",
          {
            ascending: true,
          }
        );

    if (studentsError) {
      console.error(
        "Students error:",
        studentsError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            studentsError.message,
        },
        { status: 500 }
      );
    }

    if (
      !students ||
      students.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ada data siswa di tabel students.",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * 9. RESULT
     * =====================================================
     */

    const results: Array<{
      student_id: string;
      name: string;
      nis: string | null;
      email?: string;
      user_id?: string;
      password?: string | null;
      status:
        | "created"
        | "already_exists"
        | "skipped"
        | "error";
      message?: string;
    }> = [];

    /*
     * =====================================================
     * 10. PROSES SEMUA SISWA
     * =====================================================
     */

    for (const student of students) {
      const studentName =
        student.full_name
          ?.trim() ||
        "Tanpa Nama";

      const nis =
        student.nis
          ?.toString()
          .trim() || "";

      /*
       * ---------------------------------------------------
       * NIS WAJIB
       * ---------------------------------------------------
       */

      if (!nis) {
        results.push({
          student_id:
            String(student.id),

          name:
            studentName,

          nis: null,

          status:
            "skipped",

          message:
            "Siswa tidak memiliki NIS.",
        });

        continue;
      }

      /*
       * ---------------------------------------------------
       * NORMALIZE NIS
       * ---------------------------------------------------
       */

      const normalizedNis =
        normalizeNis(nis);

      if (!normalizedNis) {
        results.push({
          student_id:
            String(student.id),

          name:
            studentName,

          nis,

          status:
            "skipped",

          message:
            "NIS tidak valid.",
        });

        continue;
      }

      /*
       * ---------------------------------------------------
       * EMAIL INTERNAL
       * ---------------------------------------------------
       */

      const internalEmail =
        `student-${normalizedNis}@students.hstkb.id`;

      /*
       * ---------------------------------------------------
       * USER ID
       * ---------------------------------------------------
       */

      let authUserId =
        student.user_id ||
        null;

      let temporaryPassword:
        | string
        | null = null;

      /*
       * ===================================================
       * 11. CEK students.user_id
       * ===================================================
       */

      if (authUserId) {
        const {
          data: existingAuthUser,
          error:
            existingAuthError,
        } =
          await supabaseAdmin.auth.admin.getUserById(
            authUserId
          );

        if (
          existingAuthError ||
          !existingAuthUser?.user
        ) {
          authUserId = null;
        }
      }

      /*
       * ===================================================
       * 12. CEK PROFILE BERDASARKAN EMAIL SISWA
       * ===================================================
       */

      if (!authUserId) {
        const {
          data:
            existingProfile,
          error:
            existingProfileError,
        } =
          await supabaseAdmin
            .from(
              "users_profile"
            )
            .select(
              "id, email, role"
            )
            .ilike(
              "email",
              internalEmail
            )
            .limit(1)
            .maybeSingle();

        if (
          existingProfileError
        ) {
          console.error(
            `Profile lookup error ${studentName}:`,
            existingProfileError
          );
        }

        if (
          existingProfile?.id
        ) {
          const {
            data:
              existingAuthUser,
          } =
            await supabaseAdmin.auth.admin.getUserById(
              existingProfile.id
            );

          if (
            existingAuthUser?.user
          ) {
            authUserId =
              existingProfile.id;
          }
        }
      }

      /*
       * ===================================================
       * 13. BUAT AUTH USER BARU
       * ===================================================
       */

      if (!authUserId) {
        temporaryPassword =
          generatePassword();

        const {
          data:
            createdUser,
          error:
            createUserError,
        } =
          await supabaseAdmin.auth.admin.createUser(
            {
              email:
                internalEmail,

              password:
                temporaryPassword,

              email_confirm:
                true,

              user_metadata: {
                full_name:
                  studentName,

                nis,

                role:
                  "murid",

                student_id:
                  student.id,
              },
            }
          );

        if (
          createUserError ||
          !createdUser?.user
        ) {
          console.error(
            `Create user error ${studentName}:`,
            createUserError
          );

          results.push({
            student_id:
              String(
                student.id
              ),

            name:
              studentName,

            nis,

            status:
              "error",

            message:
              createUserError?.message ||
              "Gagal membuat akun Auth.",
          });

          continue;
        }

        authUserId =
          createdUser.user.id;
      }

      /*
       * ===================================================
       * 14. USERS_PROFILE
       * ===================================================
       */

      const {
        error:
          profileUpsertError,
      } =
        await supabaseAdmin
          .from(
            "users_profile"
          )
          .upsert(
            {
              id:
                authUserId,

              full_name:
                studentName,

              email:
                internalEmail,

              role:
                "murid",

              is_active:
                true,
            },
            {
              onConflict:
                "id",
            }
          );

      if (
        profileUpsertError
      ) {
        console.error(
          `users_profile error ${studentName}:`,
          profileUpsertError
        );

        results.push({
          student_id:
            String(
              student.id
            ),

          name:
            studentName,

          nis,

          status:
            "error",

          message:
            `Gagal menyimpan users_profile: ${profileUpsertError.message}`,
        });

        continue;
      }

      /*
       * ===================================================
       * 15. HUBUNGKAN students.user_id
       * ===================================================
       */

      const {
        error:
          studentUpdateError,
      } =
        await supabaseAdmin
          .from("students")
          .update({
            user_id:
              authUserId,
          })
          .eq(
            "id",
            student.id
          );

      if (
        studentUpdateError
      ) {
        console.error(
          `students.user_id error ${studentName}:`,
          studentUpdateError
        );

        results.push({
          student_id:
            String(
              student.id
            ),

          name:
            studentName,

          nis,

          status:
            "error",

          message:
            `Gagal menghubungkan students.user_id: ${studentUpdateError.message}`,
        });

        continue;
      }

      /*
       * ===================================================
       * 16. SUCCESS RESULT
       * ===================================================
       */

      results.push({
        student_id:
          String(
            student.id
          ),

        name:
          studentName,

        nis,

        email:
          internalEmail,

        user_id:
          authUserId,

        password:
          temporaryPassword,

        status:
          temporaryPassword
            ? "created"
            : "already_exists",
      });
    }

    /*
     * =====================================================
     * 17. SUMMARY
     * =====================================================
     */

    const created =
      results.filter(
        (item) =>
          item.status ===
          "created"
      ).length;

    const alreadyExists =
      results.filter(
        (item) =>
          item.status ===
          "already_exists"
      ).length;

    const skipped =
      results.filter(
        (item) =>
          item.status ===
          "skipped"
      ).length;

    const errors =
      results.filter(
        (item) =>
          item.status ===
          "error"
      ).length;

    /*
     * =====================================================
     * 18. RETURN
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      summary: {
        total:
          students.length,

        created,

        already_exists:
          alreadyExists,

        skipped,

        errors,
      },

      results,
    });
  } catch (error) {
    console.error(
      "Student account generator error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat akun siswa.",
      },
      {
        status: 500,
      }
    );
  }
}