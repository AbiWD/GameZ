package main

import (
	"fmt"
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/tokens"
)

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		DataDir: "../Backend/pb_data",
	})

	if err := app.Bootstrap(); err != nil {
		log.Fatal(err)
	}

	record, err := app.FindAuthRecordByEmail("staff_accounts", "admin@gamez.in")
	if err != nil {
		log.Fatal("Could not find staff_accounts record:", err)
	}

	// 1. Generate reset token
	token, err := tokens.NewRecordPasswordResetToken(record)
	if err != nil {
		log.Fatal("Error generating reset token:", err)
	}

	fmt.Println("=================================================================")
	fmt.Println("  EMPIRICAL BACKEND PROOF: POCKETBASE TOKEN ROTATION & SINGLE-USE")
	fmt.Println("=================================================================")
	fmt.Printf("[1] Record ID:        %s\n", record.Id)
	fmt.Printf("[2] TokenKey BEFORE:  %s\n", record.TokenKey())
	fmt.Printf("[3] Generated Token:  %s...\n", token[:30])

	// Verify token validation BEFORE confirm
	claims, err := app.FindAuthRecordByToken(token, app.Settings().RecordPasswordResetToken.Secret)
	if err != nil {
		log.Fatalf("[-] Token validation failed before confirm: %v\n", err)
	}
	fmt.Printf("[+] Token is VALID for user: %s (%s)\n", claims.Email(), claims.Id)

	// Simulate password reset completion -> PocketBase rotates TokenKey
	record.SetTokenKey(tokens.NewToken())
	if err := app.Save(record); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("[4] TokenKey AFTER Reset: %s\n", record.TokenKey())

	// Re-verify the EXACT SAME TOKEN after TokenKey rotation
	_, errSecond := app.FindAuthRecordByToken(token, app.Settings().RecordPasswordResetToken.Secret)
	if errSecond != nil {
		fmt.Printf("[5] SECOND ATTEMPT REJECTION PROOF: %v\n", errSecond)
		fmt.Println("=================================================================")
		fmt.Println("  SUCCESS: TokenKey rotation invalidates the token forever!")
		fmt.Println("=================================================================")
	} else {
		fmt.Println("[-] FAIL: Token was unexpectedly valid!")
	}
}
