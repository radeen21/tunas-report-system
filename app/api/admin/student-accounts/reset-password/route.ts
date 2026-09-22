import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY!;

/*
 * =========================================================
 * CLIENT UNTUK VALIDASI SESSION
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
     * 2. AMBIL TOKEN
     * =====================================================
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
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

    /*
     * =====================================================
     * 3. VALIDASI USER LOGIN
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

    /*
     * =====================================================
     * 4. CARI PROFILE ADMIN
     * =====================================================
     */

    let currentProfile:
      | {
          id: string;
          full_name: string | null;
          email: string | null;
          role: string | null;
          is_active: boolean | null;
        }
      | null = null;

    /*
     * Cari berdasarkan ID
     */

    const {
      data: profileById,
    } =
      await supabaseAdmin
        .from("users_profile")
        .select(
          "id, full_name, email, role, is_active"
        )
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();

    if (profileById) {
      currentProfile =
        profileById;
    }

    /*
     * Kalau tidak ketemu, cari berdasarkan email
     */

    if (
      !currentProfile &&
      currentUser.email
    ) {
      const {
        data: profileByEmail,
      } =
        await supabaseAdmin
          .from("users_profile")
          .select(
            "id, full_name, email, role, is_active"
          )
          .ilike(
            "email",
            currentUser.email
          )
          .limit(1)
          .maybeSingle();

      if (profileByEmail) {
        currentProfile =
          profileByEmail;
      }
    }

    if (!currentProfile) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Profile user yang sedang login tidak ditemukan.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * 5. CEK ROLE
     * =====================================================
     */

    const role =
      String(
        currentProfile.role || ""
      )
        .toLowerCase()
        .trim()
        .replace(
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
        role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Role "${currentProfile.role}" tidak memiliki izin untuk reset password siswa.`,
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * 6. AMBIL SEMUA SISWA YANG SUDAH PUNYA AKUN
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
          user_id
          `
        )
        .not(
          "user_id",
          "is",
          null
        )
        .order(
          "full_name",
          {
            ascending: true,
          }
        );

    if (studentsError) {
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
            "Tidak ada siswa yang memiliki akun.",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * 7. RESET PASSWORD
     * =====================================================
     */

    const results: Array<{
      student_id: string;
      name: string;
      nis: string | null;
      user_id: string;
      email: string | null;
      password: string | null;
      status:
        | "success"
        | "error";
      message?: string;
    }> = [];

    for (const student of students) {
      const userId =
        student.user_id;

      if (!userId) {
        continue;
      }

      const password =
        generatePassword();

      /*
       * Update password Auth
       */

      const {
        data: updatedUser,
        error: updateError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            password,
          }
        );

      if (
        updateError ||
        !updatedUser?.user
      ) {
        console.error(
          `Reset password error ${student.full_name}:`,
          updateError
        );

        results.push({
          student_id:
            String(student.id),

          name:
            student.full_name ||
            "Tanpa Nama",

          nis:
            student.nis
              ?.toString()
              .trim() || null,

          user_id:
            userId,

          email:
            updatedUser?.user
              ?.email || null,

          password:
            null,

          status:
            "error",

          message:
            updateError?.message ||
            "Gagal mengubah password.",
        });

        continue;
      }

      /*
       * Success
       */

      results.push({
        student_id:
          String(student.id),

        name:
          student.full_name ||
          "Tanpa Nama",

        nis:
          student.nis
            ?.toString()
            .trim() || null,

        user_id:
          userId,

        email:
          updatedUser.user.email ||
          null,

        password,

        status:
          "success",
      });
    }

    /*
     * =====================================================
     * 8. SUMMARY
     * =====================================================
     */

    const successCount =
      results.filter(
        (item) =>
          item.status ===
          "success"
      ).length;

    const errorCount =
      results.filter(
        (item) =>
          item.status ===
          "error"
      ).length;

    /*
     * =====================================================
     * 9. RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      summary: {
        total:
          students.length,

        success:
          successCount,

        errors:
          errorCount,
      },

      results,
    });
  } catch (error) {
    console.error(
      "Reset student passwords error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat reset password siswa.",
      },
      {
        status: 500,
      }
    );
  }
}