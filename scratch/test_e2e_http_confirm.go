package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/pocketbase/pocketbase"
)

func main() {
	app := pocketbase.New()

	if err := app.Bootstrap(); err != nil {
		log.Fatal(err)
	}

	// 1. Find or create test staff_accounts admin record
	record, err := app.FindAuthRecordByEmail("staff_accounts", "admin@gamez.in")
	if err != nil {
		log.Fatal("Could not find record:", err)
	}

	// 2. Generate valid password reset token
	token, err := record.NewPasswordResetToken()
	if err != nil {
		log.Fatal("Error generating reset token:", err)
	}

	fmt.Println("=========================================================================")
	fmt.Println("  EMPIRICAL HTTP REST API TEST: CONFIRM (204) + REUSE REJECTION (400)")
	fmt.Println("=========================================================================")
	fmt.Printf("[1] Target Account Email: %s (ID: %s)\n", record.Email(), record.Id)
	fmt.Printf("[2] Generated Reset Token: %s...\n", token[:40])

	// 3. STEP A: FIRST HTTP confirmPasswordReset request against HTTP API endpoint
	fmt.Println("\n[STEP 3] Calling HTTP POST /api/collections/staff_accounts/confirm-password-reset (First Attempt)...")

	payloadData := map[string]string{
		"token":           token,
		"password":        "NewSecretPassword123!",
		"passwordConfirm": "NewSecretPassword123!",
	}
	bodyBytes, _ := json.Marshal(payloadData)

	req1, _ := http.NewRequest("POST", "http://127.0.0.1:8090/api/collections/staff_accounts/confirm-password-reset", bytes.NewBuffer(bodyBytes))
	req1.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp1, err := client.Do(req1)
	if err != nil {
		log.Fatal("HTTP request 1 failed:", err)
	}
	defer resp1.Body.Close()
	resp1Body, _ := io.ReadAll(resp1.Body)

	fmt.Printf(" [+] HTTP Status Code: %d (Expected: 204 No Content)\n", resp1.StatusCode)
	fmt.Printf(" [+] Response Body:   '%s'\n", string(resp1Body))

	// 4. STEP B: SECOND HTTP confirmPasswordReset request using the EXACT SAME TOKEN
	fmt.Println("\n[STEP 4] Calling HTTP POST /api/collections/staff_accounts/confirm-password-reset (Second Attempt - Reuse)...")

	req2, _ := http.NewRequest("POST", "http://127.0.0.1:8090/api/collections/staff_accounts/confirm-password-reset", bytes.NewBuffer(bodyBytes))
	req2.Header.Set("Content-Type", "application/json")

	resp2, err := client.Do(req2)
	if err != nil {
		log.Fatal("HTTP request 2 failed:", err)
	}
	defer resp2.Body.Close()
	resp2Body, _ := io.ReadAll(resp2.Body)

	fmt.Printf(" [+] HTTP Status Code: %d (Expected: 400 Bad Request)\n", resp2.StatusCode)
	fmt.Printf(" [+] Response Body:   '%s'\n", string(resp2Body))

	fmt.Println("\n=========================================================================")
	if resp1.StatusCode == 204 && resp2.StatusCode == 400 {
		fmt.Println(" SUCCESS: First attempt returned 204 (OK), Second attempt returned 400 (REJECTED)!")
	} else {
		fmt.Println(" FAILURE: HTTP status codes did not match expected 204 and 400.")
	}
	fmt.Println("=========================================================================")
}
